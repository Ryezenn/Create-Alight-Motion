require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const { connectDB, checkConnection } = require('./db');

// Import routes
const authRoutes = require('./routes/auth').router;
const amRoutes = require('./routes/am');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database (Resilient)
connectDB();

// Security Headers
// Customize Content Security Policy to allow external font/style assets and Cloudflare Turnstile
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://challenges.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
            frameSrc: ["'self'", "https://challenges.cloudflare.com"],
            connectSrc: ["'self'", "https://challenges.cloudflare.com", "https://api.ipify.org"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny' // Prevent Clickjacking completely
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    xssFilter: true,
    noSniff: true
}));

// Additional custom security headers
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Powered-By', 'Ryezen-Core'); // Obfuscate Express
    next();
});

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware with MongoDB Store
// We use a fallback memory store if Mongo connection fails, so the site doesn't crash on boot
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'alightmotion_premium_default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true in production if HTTPS is available
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};

// Check if we can instantiate MongoStore (only if DB URI is configured and reachable)
try {
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 1 day
        crypto: {
            secret: process.env.SESSION_SECRET || 'alightmotion_premium_default_secret'
        }
    });
} catch (e) {
    console.warn("[Session] Gagal menggunakan MongoDB session store. Menggunakan MemoryStore sebagai cadangan.", e.message);
}

app.use(session(sessionConfig));

// Rate Limiting to prevent abuse
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // limit each IP to 150 requests per windowMs
    message: { error: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: { error: 'Terlalu banyak percobaan masuk/daftar. Silakan coba lagi nanti.' }
});

const amLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 15, // limit each IP to 15 AM activations per 5 minutes
    message: { error: 'Terlalu banyak pengiriman link/aktivasi. Mohon tunggu beberapa menit.' }
});

// Apply rate limits
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/am/send-link', amLimiter);
app.use('/api/am/activate', amLimiter);

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Public Configuration Route (NO DB REQUIRED)
app.get('/api/auth/config', (req, res) => {
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    const isVercel = req.hostname.endsWith('.vercel.app');
    const siteKey = (isLocalhost || isVercel) ? '1x00000000000000000000AA' : (process.env.TURNSTILE_SITE_KEY || '0x4AAAAAAD7RpjTPThhr5v1Q');
    
    return res.json({
        turnstileSiteKey: siteKey
    });
});

// API Routes (Blocked by checkConnection if MongoDB is offline)
app.use('/api/auth', checkConnection, authRoutes);
app.use('/api/am', checkConnection, amRoutes);
app.use('/api/admin', checkConnection, adminRoutes);

// Fallback to serving index.html for SPA feel
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`   Local URL: http://localhost:${PORT}`);
        console.log(`==================================================`);
    });
}

module.exports = app;
