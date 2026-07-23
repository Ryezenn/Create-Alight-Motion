const express = require('express');
const router = express.Router();
const amAuth = require('../am');
const User = require('../models/User');
const Activation = require('../models/Activation');

// API Key authentication middleware
const authenticateAPIKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apikey || (req.body && req.body.apikey);
    if (!apiKey) {
        return res.status(401).json({ error: 'API Key wajib disertakan.' });
    }

    try {
        const user = await User.findOne({ apiKey });
        if (!user) {
            return res.status(401).json({ error: 'API Key tidak valid.' });
        }

        if (user.status === 'banned') {
            return res.status(403).json({ error: 'Akun Anda dinonaktifkan (banned).' });
        }

        if (user.role !== 'admin') {
            if (user.apiPlan === 'none') {
                return res.status(403).json({ error: 'Rencana API tidak aktif. Silakan lakukan pembayaran terlebih dahulu.' });
            }

            if (user.apiPlan === 'monthly' && user.apiExpiresAt && user.apiExpiresAt < new Date()) {
                return res.status(403).json({ error: 'Rencana API bulanan Anda telah kedaluwarsa.' });
            }
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('API Key auth error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan sistem internal.' });
    }
};

// 1. Send Magic Link
router.all('/send-link', authenticateAPIKey, async (req, res) => {
    const email = req.body.email || req.query.email;
    if (!email) {
        return res.status(400).json({ error: 'Email Alight Motion harus diisi.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
    }

    if (req.user.role !== 'admin' && req.user.credits <= 0) {
        return res.status(400).json({ error: 'Kredit Anda tidak mencukupi (0 kredit).' });
    }

    try {
        const result = await amAuth.sendMagicLink(email.trim());
        if (result.success) {
            return res.json({ success: true, message: 'Pesan verifikasi berhasil dikirim!' });
        } else {
            return res.status(500).json({ error: result.error || 'Gagal mengirim pesan verifikasi.' });
        }
    } catch (error) {
        console.error('Bot send link error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// 2. Activate Premium
router.all('/activate', authenticateAPIKey, async (req, res) => {
    const email = req.body.email || req.query.email;
    const magicLink = req.body.magicLink || req.query.magicLink || req.body.magic_link || req.query.magic_link;

    if (!email || !magicLink) {
        return res.status(400).json({ error: 'Email dan Tautan Verifikasi (magicLink) wajib diisi.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
    }

    if (req.user.role !== 'admin' && req.user.credits <= 0) {
        return res.status(400).json({ error: 'Kredit Anda tidak mencukupi.' });
    }

    try {
        const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // Save pending log
        const activationLog = new Activation({
            userId: req.user._id,
            username: req.user.username,
            targetEmail: email.trim().toLowerCase(),
            codeorder: randomCode,
            status: 'pending'
        });
        await activationLog.save();

        const profileResult = await amAuth.verifyAndFetchProfile(email.trim(), magicLink.trim());
        if (!profileResult.success) {
            let readableError = profileResult.error;
            if (typeof readableError === 'string' && readableError.includes('EXPIRED_OOB_CODE')) {
                readableError = 'Tautan verifikasi sudah kedaluwarsa.';
            } else if (typeof readableError === 'string' && readableError.includes('INVALID_OOB_CODE')) {
                readableError = 'Tautan verifikasi tidak valid atau sudah pernah digunakan.';
            }
            
            activationLog.status = 'failed';
            activationLog.error = readableError || 'Gagal memverifikasi tautan.';
            await activationLog.save();
            return res.status(400).json({ error: activationLog.error });
        }

        const idToken = profileResult.idToken;
        const premiumResult = await amAuth.applyPremium(idToken, randomCode);

        if (!premiumResult.success) {
            activationLog.status = 'failed';
            activationLog.error = premiumResult.error || 'Gagal menerapkan lisensi premium Alight Motion.';
            await activationLog.save();
            return res.status(500).json({ error: activationLog.error });
        }

        activationLog.status = 'success';
        await activationLog.save();

        if (req.user.role !== 'admin') {
            req.user.credits = Math.max(0, req.user.credits - 1);
            await req.user.save();
        }

        return res.json({
            success: true,
            message: 'Aktivasi Premium Alight Motion Berhasil!',
            creditsRemaining: req.user.credits
        });
    } catch (error) {
        console.error('Bot activate error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
