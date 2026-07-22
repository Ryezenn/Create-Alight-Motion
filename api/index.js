const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const amAuth = require('../am');
const axios = require('axios');

const TURNSTILE_SECRET_KEY = "0x4AAAAAAD7RpkI6EfNTZ6m_nDvfrqxR7Xg";

async function verifyTurnstile(token) {
    if (!token) return false;
    try {
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: TURNSTILE_SECRET_KEY,
            response: token
        });
        return response.data.success === true;
    } catch (e) {
        console.error('[Turnstile] Verification request failed:', e.message);
        return false;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Atlas
const MONGODB_URI = "mongodb+srv://ryuzo:Hanzz73088@cluster0.j0jxvhq.mongodb.net/alight-motion?retryWrites=true&w=majority&appName=Cluster0";

// Local Database Fallback Variables & Helper Functions
let isMongoConnected = false;
let fallbackUsers = [];
let fallbackActivations = [];

const fs = require('fs');
const FALLBACK_USERS_FILE = path.join(__dirname, '../fallback_users.json');
const FALLBACK_ACTIVATIONS_FILE = path.join(__dirname, '../fallback_activations.json');

function loadFallbackData() {
    try {
        if (fs.existsSync(FALLBACK_USERS_FILE)) {
            fallbackUsers = JSON.parse(fs.readFileSync(FALLBACK_USERS_FILE, 'utf-8'));
        }
        if (fs.existsSync(FALLBACK_ACTIVATIONS_FILE)) {
            fallbackActivations = JSON.parse(fs.readFileSync(FALLBACK_ACTIVATIONS_FILE, 'utf-8'));
        }
        console.log(`[Backup DB] Fallback JSON loaded. Users: ${fallbackUsers.length}, Activations: ${fallbackActivations.length}`);
    } catch (e) {
        console.error('[Backup DB] Failed to load fallback JSON database:', e.message);
    }
}

function saveFallbackData() {
    try {
        fs.writeFileSync(FALLBACK_USERS_FILE, JSON.stringify(fallbackUsers, null, 2));
        fs.writeFileSync(FALLBACK_ACTIVATIONS_FILE, JSON.stringify(fallbackActivations, null, 2));
    } catch (e) {
        console.error('[Backup DB] Failed to save fallback JSON database:', e.message);
    }
}

// Load fallback database on startup
loadFallbackData();

mongoose.connect(MONGODB_URI)
    .then(() => {
        isMongoConnected = true;
        console.log('==================================================\n✅ Connected successfully to MongoDB.\n==================================================');
    })
    .catch(err => {
        isMongoConnected = false;
        console.error('==================================================\n❌ Failed to connect to MongoDB:', err.message);
        console.log('⚠️  System will fallback to Local JSON Database for login, register, and history.\n==================================================');
    });

// Define Mongoose Schema
const ActivationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    orderId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Activation = mongoose.model('Activation', ActivationSchema);

const WebUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const WebUser = mongoose.model('WebUser', WebUserSchema);

// Password Hashing Helper
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Helper to generate a random order code suffix
function generateOrderCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 random digits
}

// Endpoint: Auth Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password, token } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
    }

    const isCAPTCHAValid = await verifyTurnstile(token);
    if (!isCAPTCHAValid) {
        return res.status(400).json({ success: false, error: 'Verifikasi Keamanan (CAPTCHA) gagal. Silakan coba lagi.' });
    }

    try {
        const cleanedUsername = username.trim().toLowerCase();
        
        if (isMongoConnected) {
            // Check if user already exists in MongoDB
            const existingUser = await WebUser.findOne({ username: cleanedUsername });
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'Username sudah digunakan.' });
            }

            const hashedPassword = hashPassword(password);
            const newUser = new WebUser({
                username: cleanedUsername,
                password: hashedPassword
            });
            await newUser.save();
        } else {
            // Local JSON Fallback
            const existingUser = fallbackUsers.find(u => u.username === cleanedUsername);
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'Username sudah digunakan.' });
            }

            const hashedPassword = hashPassword(password);
            fallbackUsers.push({
                username: cleanedUsername,
                password: hashedPassword,
                createdAt: new Date()
            });
            saveFallbackData();
        }

        console.log(`[Auth] User baru terdaftar: ${cleanedUsername} (${isMongoConnected ? 'MongoDB' : 'Local DB'})`);
        return res.json({ success: true, message: 'Registrasi berhasil. Silakan login.' });
    } catch (error) {
        console.error('[Auth] Error registrasi:', error);
        return res.status(500).json({ success: false, error: 'Gagal melakukan registrasi.' });
    }
});

// Endpoint: Auth Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password, token } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
    }

    const isCAPTCHAValid = await verifyTurnstile(token);
    if (!isCAPTCHAValid) {
        return res.status(400).json({ success: false, error: 'Verifikasi Keamanan (CAPTCHA) gagal. Silakan coba lagi.' });
    }

    try {
        const cleanedUsername = username.trim().toLowerCase();
        let user = null;

        if (isMongoConnected) {
            user = await WebUser.findOne({ username: cleanedUsername });
        } else {
            user = fallbackUsers.find(u => u.username === cleanedUsername);
        }

        if (!user) {
            return res.status(400).json({ success: false, error: 'Username atau password salah.' });
        }

        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return res.status(400).json({ success: false, error: 'Username atau password salah.' });
        }

        console.log(`[Auth] User login sukses: ${cleanedUsername} (${isMongoConnected ? 'MongoDB' : 'Local DB'})`);
        return res.json({ success: true, message: 'Login berhasil.', user: { username: user.username } });
    } catch (error) {
        console.error('[Auth] Error login:', error);
        return res.status(500).json({ success: false, error: 'Gagal melakukan login.' });
    }
});

// Endpoint: Send Magic Link
app.post('/api/send-link', async (req, res) => {
    const { email, token } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email tidak boleh kosong.' });
    }

    const isCAPTCHAValid = await verifyTurnstile(token);
    if (!isCAPTCHAValid) {
        return res.status(400).json({ success: false, error: 'Verifikasi Keamanan (CAPTCHA) gagal. Silakan coba lagi.' });
    }
    
    console.log(`[Server] Request kirim magic link ke: ${email}`);
    const result = await amAuth.sendMagicLink(email);
    if (result.success) {
        return res.json({ success: true, message: result.message });
    } else {
        return res.status(500).json({ success: false, error: result.error });
    }
});

// Endpoint: Verify Link & Activate 1-Year Premium
app.post('/api/activate', async (req, res) => {
    const { email, link } = req.body;
    if (!email || !link) {
        return res.status(400).json({ success: false, error: 'Email dan link verifikasi wajib diisi.' });
    }

    console.log(`[Server] Request aktivasi untuk: ${email}`);
    
    // Step 1: Verify link and get profile/ID Token
    const verifyResult = await amAuth.verifyAndFetchProfile(email, link);
    if (!verifyResult.success) {
        return res.status(400).json({ 
            success: false, 
            step: 'verification',
            error: verifyResult.error || 'Gagal memverifikasi magic link. Pastikan email dan link sesuai dan link belum kadaluarsa.' 
        });
    }

    const { idToken, user } = verifyResult;
    const codeorder = generateOrderCode();

    // Step 2: Apply Premium (1 year)
    const premiumResult = await amAuth.applyPremium(idToken, codeorder);
    if (premiumResult.success) {
        console.log(`[Server] ✅ Aktivasi premium berhasil untuk ${email}`);
        
        const finalOrderId = `Ryezenn.6767-${codeorder}`;
        
        // Save activation record to Database
        try {
            if (isMongoConnected) {
                const newActivation = new Activation({
                    email: user.email,
                    orderId: finalOrderId
                });
                await newActivation.save();
            } else {
                fallbackActivations.unshift({
                    email: user.email,
                    orderId: finalOrderId,
                    timestamp: new Date()
                });
                // Limit to last 100 entries
                if (fallbackActivations.length > 100) {
                    fallbackActivations = fallbackActivations.slice(0, 100);
                }
                saveFallbackData();
            }
            console.log(`[Server] Saved database record successfully for: ${user.email} (${isMongoConnected ? 'MongoDB' : 'Local DB'})`);
        } catch (dbErr) {
            console.error(`[Server] Database save failed: ${dbErr.message}`);
        }

        return res.json({ 
            success: true, 
            message: 'Aktivasi Premium Alight Motion 1 Tahun Berhasil!',
            user: {
                email: user.email,
                localId: user.localId,
                displayName: user.displayName || 'Alight Motion User',
                createdAt: user.createdAt
            },
            orderId: finalOrderId,
            data: premiumResult.data
        });
    } else {
        return res.status(500).json({ 
            success: false, 
            step: 'activation',
            error: premiumResult.error || 'Gagal menerapkan premium. Silakan coba lagi.' 
        });
    }
});

// Endpoint: Fetch Activation History
app.get('/api/history', async (req, res) => {
    try {
        if (isMongoConnected) {
            const history = await Activation.find({}).sort({ timestamp: -1 }).limit(50);
            const totalCount = await Activation.countDocuments();
            return res.json({ success: true, history, totalCount });
        } else {
            // Local JSON Fallback
            const history = fallbackActivations.slice(0, 50);
            const totalCount = fallbackActivations.length;
            return res.json({ success: true, history, totalCount });
        }
    } catch (error) {
        console.error('[Server] Gagal mengambil riwayat:', error.message);
        return res.status(500).json({ success: false, error: 'Gagal mengambil riwayat database.' });
    }
});

// Serve admin.html for the admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

// Fallback to index.html for spa
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Export app for serverless environment, only listen if run directly or not on Vercel
if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`🚀 Alight Motion Activator Server running on port ${PORT}`);
        console.log(`   Akses website di: http://localhost:${PORT}`);
        console.log(`==================================================`);
    });
}

module.exports = app;
