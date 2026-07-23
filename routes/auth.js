const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');

// Helper to verify Cloudflare Turnstile Token
const verifyTurnstile = async (token, ip) => {
    if (!token) return false;
    // Check if it is a testing token (starts with 1x00000)
    const isTestToken = token.startsWith('1x00000000000000000000');
    const secretKey = isTestToken ? '1x0000000000000000000000000000000UN' : process.env.TURNSTILE_SECRET_KEY;
    
    try {
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', null, {
            params: {
                secret: secretKey,
                response: token,
                remoteip: ip
            }
        });
        return response.data.success;
    } catch (err) {
        console.error('Turnstile verification error:', err);
        return false;
    }
};

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
};

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { username, password, turnstileToken } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi.' });
        }
        if (username.length < 3 || password.length < 6) {
            return res.status(400).json({ error: 'Username minimal 3 karakter, password minimal 6 karakter.' });
        }

        // Verify Turnstile Token
        const isTurnstileValid = await verifyTurnstile(turnstileToken, req.ip);
        if (!isTurnstileValid) {
            return res.status(400).json({ error: 'Verifikasi Turnstile gagal. Silakan coba lagi.' });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username sudah digunakan.' });
        }

        // Check if this is the first user in the system. If so, make them admin.
        const userCount = await User.countDocuments({});
        const role = userCount === 0 ? 'admin' : 'user';
        const defaultCredits = role === 'admin' ? 999999 : 5; // Admins get unlimited credits

        const newUser = new User({
            username: username.toLowerCase().trim(),
            password,
            role,
            credits: defaultCredits
        });

        await newUser.save();
        return res.status(201).json({ success: true, message: 'Registrasi berhasil. Silakan login.' });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password, turnstileToken } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi.' });
        }

        // Verify Turnstile Token
        const isTurnstileValid = await verifyTurnstile(turnstileToken, req.ip);
        if (!isTurnstileValid) {
            return res.status(400).json({ error: 'Verifikasi Turnstile gagal. Silakan coba lagi.' });
        }

        const user = await User.findOne({ username: username.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        if (user.status === 'banned') {
            return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan (banned).' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        // Set session
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.username = user.username;

        return res.json({
            success: true,
            message: 'Login berhasil.',
            user: {
                username: user.username,
                role: user.role,
                credits: user.credits
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Gagal logout.' });
        }
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logout berhasil.' });
    });
});

// Get Profile Route
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }
        if (user.status === 'banned') {
            req.session.destroy();
            return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
        }
        return res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = { router, isAuthenticated };
