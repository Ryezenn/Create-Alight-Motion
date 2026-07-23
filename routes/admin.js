const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activation = require('../models/Activation');
const { isAuthenticated } = require('./auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Akses ditolak. Anda bukan admin.' });
};

// Admin overview stats
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const totalActivations = await Activation.countDocuments({});
        const successActivations = await Activation.countDocuments({ status: 'success' });
        const failedActivations = await Activation.countDocuments({ status: 'failed' });

        return res.json({
            stats: {
                totalUsers,
                totalActivations,
                successActivations,
                failedActivations
            }
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Get all users list
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        return res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Update user credits
router.post('/user/credits', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId, credits } = req.body;
        if (!userId || credits === undefined || credits === null) {
            return res.status(400).json({ error: 'UserId dan credits wajib diisi.' });
        }

        const creditsNum = parseInt(credits);
        if (isNaN(creditsNum) || creditsNum < 0) {
            return res.status(400).json({ error: 'Credits harus berupa angka positif.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        user.credits = creditsNum;
        await user.save();

        return res.json({ success: true, message: `Kredit user ${user.username} berhasil diubah menjadi ${creditsNum}.`, user });
    } catch (error) {
        console.error('Update credits error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Toggle user status (Active / Banned)
router.post('/user/toggle-ban', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'UserId wajib diisi.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ error: 'Tidak dapat melakukan tindakan banned pada Admin.' });
        }

        user.status = user.status === 'active' ? 'banned' : 'active';
        await user.save();

        return res.json({ success: true, message: `Status user ${user.username} berhasil diubah menjadi ${user.status}.`, user });
    } catch (error) {
        console.error('Toggle ban error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// View all activation logs (global history)
router.get('/logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const logs = await Activation.find({})
            .sort({ createdAt: -1 })
            .limit(100);
        return res.json({ logs });
    } catch (error) {
        console.error('Get admin logs error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// View all transactions (payment history)
router.get('/transactions', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const Transaction = require('../models/Transaction');
        const transactions = await Transaction.find({})
            .sort({ createdAt: -1 })
            .limit(100);
        return res.json({ transactions });
    } catch (error) {
        console.error('Get admin transactions error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Manually approve a pending transaction
router.post('/transaction/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { refNo } = req.body;
        if (!refNo) {
            return res.status(400).json({ error: 'RefNo wajib diisi.' });
        }

        const Transaction = require('../models/Transaction');
        const tx = await Transaction.findOne({ refNo });
        if (!tx) {
            return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
        }

        if (tx.status === 'success') {
            return res.status(400).json({ error: 'Transaksi sudah berstatus success.' });
        }

        // Update transaction status
        tx.status = 'success';
        tx.settledAt = new Date();
        await tx.save();

        // Update/generate API key and plan details for target user
        const crypto = require('crypto');
        const user = await User.findById(tx.userId);
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
            return res.json({ success: true, message: `Transaksi ${refNo} berhasil disetujui secara manual. API Key user ${user.username} aktif.` });
        } else {
            return res.status(404).json({ error: 'Pengguna terkait transaksi tidak ditemukan.' });
        }
    } catch (error) {
        console.error('Approve transaction error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
