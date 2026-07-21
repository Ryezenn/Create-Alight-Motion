const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const amAuth = require('./am');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Atlas
const MONGODB_URI = "mongodb+srv://ryuzo:Hanzz7308@cluster0.j0jxvhq.mongodb.net/alight-motion?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI)
    .then(() => console.log('==================================================\n✅ Connected successfully to MongoDB.\n=================================================='))
    .catch(err => console.error('==================================================\n❌ Failed to connect to MongoDB:', err.message, '\n=================================================='));

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
app.use(express.static(path.join(__dirname, 'public')));

// Helper to generate a random order code suffix
function generateOrderCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 random digits
}

// Endpoint: Auth Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
    }

    try {
        const cleanedUsername = username.trim().toLowerCase();
        // Check if user already exists
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

        console.log(`[Auth] User baru terdaftar: ${cleanedUsername}`);
        return res.json({ success: true, message: 'Registrasi berhasil. Silakan login.' });
    } catch (error) {
        console.error('[Auth] Error registrasi:', error);
        return res.status(500).json({ success: false, error: 'Gagal melakukan registrasi.' });
    }
});

// Endpoint: Auth Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
    }

    try {
        const cleanedUsername = username.trim().toLowerCase();
        const user = await WebUser.findOne({ username: cleanedUsername });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Username atau password salah.' });
        }

        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return res.status(400).json({ success: false, error: 'Username atau password salah.' });
        }

        console.log(`[Auth] User login sukses: ${cleanedUsername}`);
        return res.json({ success: true, message: 'Login berhasil.', user: { username: user.username } });
    } catch (error) {
        console.error('[Auth] Error login:', error);
        return res.status(500).json({ success: false, error: 'Gagal melakukan login.' });
    }
});

// Endpoint: Send Magic Link
app.post('/api/send-link', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email tidak boleh kosong.' });
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
        
        // Save activation record to MongoDB
        try {
            const newActivation = new Activation({
                email: user.email,
                orderId: finalOrderId
            });
            await newActivation.save();
            console.log(`[Server] Saved database record successfully for: ${user.email}`);
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

// Endpoint: Fetch Activation History from MongoDB
app.get('/api/history', async (req, res) => {
    try {
        const history = await Activation.find({}).sort({ timestamp: -1 }).limit(50);
        const totalCount = await Activation.countDocuments();
        return res.json({ success: true, history, totalCount });
    } catch (error) {
        console.error('[Server] Gagal mengambil riwayat dari MongoDB:', error.message);
        return res.status(500).json({ success: false, error: 'Gagal mengambil riwayat database.' });
    }
});

// Fallback to index.html for spa
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
