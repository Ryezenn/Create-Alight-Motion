const mongoose = require('mongoose');
const axios = require('axios');

let isConnected = false;

const connectDB = async () => {
    try {
        console.log(`[Database] Mencoba menghubungkan ke MongoDB...`);
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        isConnected = true;
        console.log(`[Database] ✅ MongoDB Terhubung: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        isConnected = false;
        console.error(`[Database] ❌ Gagal terhubung ke MongoDB: ${error.message}`);
        
        try {
            // Fetch current public IP to help diagnostic
            const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
            console.error(`[Database] IP Public Anda saat ini: ${ipRes.data.ip}`);
        } catch (ipErr) {
            // Fallback if IP service is unreachable
        }
        
        console.error(`[Database] Server tetap berjalan. Silakan:`);
        console.error(`           1. Pastikan IP di atas sudah masuk "Network Access" Whitelist di MongoDB Atlas Anda (atau atur 0.0.0.0/0).`);
        console.error(`           2. Pastikan username (ryuzo) dan password (Hanzz7308) sudah benar.`);
    }
};

// Middleware to block requests if DB is not connected
const checkConnection = async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.log(`[Database] Database state is ${mongoose.connection.readyState}. Attempting to establish connection...`);
        await connectDB();
        
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                error: 'Koneksi database gagal. Silakan periksa username, password, atau IP Whitelist di MongoDB Atlas Anda.' 
            });
        }
    }
    next();
};

module.exports = { connectDB, checkConnection };
