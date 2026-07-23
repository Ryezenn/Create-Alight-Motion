const express = require('express');
const router = express.Router();
const amAuth = require('../am');
const User = require('../models/User');
const Activation = require('../models/Activation');
const { isAuthenticated } = require('./auth');

// Send Magic Link
router.post('/send-link', isAuthenticated, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email Alight Motion harus diisi.' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format email tidak valid.' });
        }

        // Check user credit
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        if (user.role !== 'admin' && user.credits <= 0) {
            return res.status(400).json({ error: 'Kredit Anda tidak mencukupi untuk membuat premium (0 kredit).' });
        }

        const result = await amAuth.sendMagicLink(email.trim());
        if (result.success) {
            return res.json({ success: true, message: 'Pesan verifikasi berhasil dikirim! Silakan periksa kotak masuk/spam email Anda.' });
        } else {
            let readableError = result.error;
            if (typeof readableError === 'string' && readableError.includes('INVALID_EMAIL')) {
                readableError = 'Email tidak terdaftar atau format email salah.';
            }
            return res.status(500).json({ error: `Gagal mengirim pesan verifikasi: ${readableError || 'Terjadi kesalahan sistem'}` });
        }
    } catch (error) {
        console.error('Send magic link error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Activate Premium
router.post('/activate', isAuthenticated, async (req, res) => {
    try {
        const { email, magicLink } = req.body;
        if (!email || !magicLink) {
            return res.status(400).json({ error: 'Email dan Tautan Verifikasi wajib diisi.' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format email tidak valid.' });
        }

        // Check user credit
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        if (user.role !== 'admin' && user.credits <= 0) {
            return res.status(400).json({ error: 'Kredit Anda tidak mencukupi untuk aktivasi premium.' });
        }

        // Generate unique codeorder
        const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // Save pending log
        const activationLog = new Activation({
            userId: user._id,
            username: user.username,
            targetEmail: email.trim().toLowerCase(),
            codeorder: randomCode,
            status: 'pending'
        });
        await activationLog.save();

        // 1. Verify oobCode & Fetch Profile (Get idToken)
        console.log(`[Activation] Verifying link for user: ${user.username}, email: ${email}`);
        const profileResult = await amAuth.verifyAndFetchProfile(email.trim(), magicLink.trim());
        
        if (!profileResult.success) {
            let readableError = profileResult.error;
            if (typeof readableError === 'string' && readableError.includes('EXPIRED_OOB_CODE')) {
                readableError = 'Tautan verifikasi sudah kedaluwarsa.';
            } else if (typeof readableError === 'string' && readableError.includes('INVALID_OOB_CODE')) {
                readableError = 'Tautan verifikasi tidak valid atau sudah pernah digunakan.';
            }
            
            activationLog.status = 'failed';
            activationLog.error = readableError || 'Gagal memverifikasi tautan (link tidak valid / kedaluwarsa).';
            await activationLog.save();
            return res.status(400).json({ error: activationLog.error });
        }

        const idToken = profileResult.idToken;

        // 2. Apply Premium subscription
        console.log(`[Activation] Applying premium for email: ${email}`);
        const premiumResult = await amAuth.applyPremium(idToken, randomCode);

        if (!premiumResult.success) {
            activationLog.status = 'failed';
            activationLog.error = premiumResult.error || 'Gagal menerapkan lisensi premium Alight Motion.';
            await activationLog.save();
            return res.status(500).json({ error: activationLog.error });
        }

        // 3. Update status to success and deduct credit
        activationLog.status = 'success';
        await activationLog.save();

        if (user.role !== 'admin') {
            user.credits = Math.max(0, user.credits - 1);
            await user.save();
        }

        return res.json({
            success: true,
            message: 'Aktivasi Premium Alight Motion Berhasil!',
            data: premiumResult.data,
            creditsRemaining: user.credits
        });

    } catch (error) {
        console.error('Activate premium error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Activation History for logged in user
router.get('/history', isAuthenticated, async (req, res) => {
    try {
        const history = await Activation.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        return res.json({ history });
    } catch (error) {
        console.error('Get history error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
