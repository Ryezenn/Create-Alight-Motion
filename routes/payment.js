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
            const data = response.data;
            
            // Save transaction to DB
            const tx = new Transaction({
                userId: req.session.userId,
                username: req.session.username,
                refNo: data.ref_no,
                amount: data.amount,
                planType: planType,
                status: 'pending',
                qrUrl: data.qr_url,
                paymentLink: data.payment_link
            });

            await tx.save();
            return res.json({ success: true, transaction: tx });
        } else {
            console.error('[Mustika Error]', response.data);
            return res.status(500).json({ error: 'Gagal membuat QRIS dari Mustika Payment.' });
        }
    } catch (error) {
        console.error('Payment create error:', error.response?.data || error.message);
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

        // Query Mustika Payment status
        const response = await axios.get(`${MUSTIKA_BASE_URL}/api/v1/check/qris`, {
            params: { ref_no: tx.refNo },
            headers: {
                'X-Api-Key': MUSTIKA_API_KEY
            },
            timeout: 5000
        });

        if (response.data && response.data.status === 'success') {
            // Update Transaction
            tx.status = 'success';
            tx.settledAt = response.data.settle_at ? new Date(response.data.settle_at) : new Date();
            await tx.save();

            // Generate/Update User API Key and Plan details
            const user = await User.findById(req.session.userId);
            if (user) {
                // Generate API Key if not exists
                if (!user.apiKey) {
                    user.apiKey = 'ak_am_' + crypto.randomBytes(16).toString('hex');
                }
                user.apiPlan = tx.planType;
                
                if (tx.planType === 'monthly') {
                    // Set or extend expiration date by 30 days
                    const currentExpiry = user.apiExpiresAt && user.apiExpiresAt > new Date() ? user.apiExpiresAt : new Date();
                    user.apiExpiresAt = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
                } else {
                    user.apiExpiresAt = null; // Lifetime
                }

                await user.save();
                return res.json({ status: 'success', apiKey: user.apiKey, planType: tx.planType });
            }
        }

        return res.json({ status: tx.status });
    } catch (error) {
        console.error('Payment status check error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Gagal mengecek status pembayaran.' });
    }
});

module.exports = router;
