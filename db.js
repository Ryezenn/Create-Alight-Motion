const mongoose = require('mongoose');
const axios = require('axios');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!process.env.MONGO_URI) {
        console.error(`[Database] ❌ MONGO_URI is missing from Environment Variables!`);
        return null;
    }

    if (!cached.promise) {
        console.log(`[Database] Mencoba menghubungkan ke MongoDB...`);
        const opts = {
            serverSelectionTimeoutMS: 5000
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
            console.log(`[Database] ✅ MongoDB Terhubung: ${mongoose.connection.host}`);
            return mongoose.connection;
        }).catch((error) => {
            console.error(`[Database] ❌ Gagal terhubung ke MongoDB: ${error.message}`);
            cached.promise = null; // Reset promise so next request can retry
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (e) {
        cached.promise = null;
        return null;
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
