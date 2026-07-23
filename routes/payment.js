const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { isAuthenticated } = require('./auth');

const MUSTIKA_API_KEY = 'MP-Ryezenn-1780782894';
const MUSTIKA_BASE_URL = 'https://mustikapayment.com';

// Create QRIS Payment Request
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { planType } = req.body;
        if (!['monthly', 'lifetime'].includes(planType)) {
            return res.status(400).json({ error: 'Plan type tidak valid.' });
        }

        // Determine price
        const amount = planType === 'monthly' ? 25000 : 50000;
        const productName = planType === 'monthly' ? 'API Key Alight Motion (1 Bulan)' : 'API Key Alight Motion (Lifetime)';

        let txData = null;

        try {
            // Call Mustika Payment API
            const params = new URLSearchParams();
            params.append('amount', amount.toString());
            params.append('product_name', productName);
            params.append('customer_name', req.session.username);
            params.append('expiry', '15'); // 15 minutes expiry
            params.append('redirect_url', `${req.protocol}://${req.get('host')}/`);

            const response = await axios.post(`${MUSTIKA_BASE_URL}/api/v1/create/qris`, params, {
                headers: {
                    'X-Api-Key': MUSTIKA_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 8000
            });

            if (response.data && response.data.status === 'success') {
                // Support both nested data structure and flat structure
                const resultData = response.data.data || response.data.transaction || response.data;
                txData = {
                    refNo: resultData.ref_no || resultData.refNo || response.data.ref_no,
                    amount: resultData.amount || response.data.amount || amount,
                    qrUrl: resultData.qr_url || resultData.qrUrl || response.data.qr_url,
                    paymentLink: resultData.payment_link || resultData.paymentLink || response.data.payment_link,
                    isMock: false
                };
            } else {
                console.warn('[Mustika API warning]', response.data);
            }
        } catch (apiErr) {
            console.error('[Mustika API error] Menggunakan fallback manual WhatsApp:', apiErr.message);
        }

        // Fallback: If Mustika API fails or returns unsuccessful, generate manual fallback transaction
        if (!txData) {
            const mockRefNo = 'AM-' + crypto.randomBytes(6).toString('hex').toUpperCase();
            // WhatsApp redirection link
            const waNumber = '6289621484600';
            const waText = encodeURIComponent(`Halo Admin, saya ingin membeli API Key ${productName} (Ref: ${mockRefNo}). Silakan kirimkan kode QRIS pembayaran manual.`);
            const paymentLink = `https://wa.me/${waNumber}?text=${waText}`;
            // QR code pointing to WhatsApp redirection
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentLink)}`;

            txData = {
                refNo: mockRefNo,
                amount: amount,
                qrUrl: qrUrl,
                paymentLink: paymentLink,
                isMock: true
            };
        }

        // Save transaction to DB
        const tx = new Transaction({
            userId: req.session.userId,
            username: req.session.username,
            refNo: txData.refNo,
            amount: txData.amount,
            planType: planType,
            status: 'pending',
            qrUrl: txData.qrUrl,
            paymentLink: txData.paymentLink
        });

        await tx.save();
        return res.json({ success: true, transaction: tx, isMock: txData.isMock });
    } catch (error) {
        console.error('Payment create error:', error.message);
        return res.status(500).json({ error: 'Terjadi kesalahan sistem saat membuat pembayaran.' });
    }
});

// Check payment status manually or on poll
router.get('/status/:refNo', isAuthenticated, async (req, res) => {
    try {
        const tx = await Transaction.findOne({ refNo: req.params.refNo, userId: req.session.userId });
        if (!tx) {
            return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
        }

        // If already success, no need to query external API
        if (tx.status === 'success') {
            const user = await User.findById(req.session.userId);
            return res.json({ status: 'success', apiKey: user.apiKey, planType: tx.planType });
        }

        // If it's a mock/manual transaction, admin has to approve it manually via Admin Panel
        if (tx.refNo.startsWith('AM-')) {
            return res.json({ status: tx.status }); // will remain pending until approved
        }

        try {
            // Query Mustika Payment status
            const response = await axios.get(`${MUSTIKA_BASE_URL}/api/v1/check/qris`, {
                params: { ref_no: tx.refNo },
                headers: {
                    'X-Api-Key': MUSTIKA_API_KEY
                },
                timeout: 5000
            });

            if (response.data) {
                const apiStatus = response.data.status;
                const resultData = response.data.data || response.data;
                const paymentStatus = resultData.status || resultData.payment_status || '';

                if (apiStatus === 'success' && (paymentStatus === 'success' || paymentStatus === 'paid' || paymentStatus === 'settled')) {
                    // Update Transaction
                    tx.status = 'success';
                    tx.settledAt = resultData.settle_at ? new Date(resultData.settle_at) : new Date();
                    await tx.save();

                    // Generate/Update User API Key and Plan details
                    const user = await User.findById(req.session.userId);
                    if (user) {
                        if (!user.apiKey) {
                            user.apiKey = 'ak_am_' + crypto.randomBytes(16).toString('hex');
                        }
                        user.apiPlan = tx.planType;
                        
                        if (tx.planType === 'monthly') {
                            const currentExpiry = user.apiExpiresAt && user.apiExpiresAt > new Date() ? user.apiExpiresAt : new Date();
                            user.apiExpiresAt = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
                        } else {
                            user.apiExpiresAt = null; // Lifetime
                        }

                        await user.save();
                        return res.json({ status: 'success', apiKey: user.apiKey, planType: tx.planType });
                    }
                }
            }
        } catch (apiCheckErr) {
            console.error('[Mustika check API error]', apiCheckErr.message);
        }

        return res.json({ status: tx.status });
    } catch (error) {
        console.error('Payment status check error:', error.message);
        return res.status(500).json({ error: 'Gagal mengecek status pembayaran.' });
    }
});

module.exports = router;
