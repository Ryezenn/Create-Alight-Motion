require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    console.log("Connecting to MongoDB...");
    console.log("URI:", process.env.MONGO_URI ? "Loaded (hidden for security)" : "MISSING!");
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Database connected successfully!");
        
        // Print database info
        const dbName = mongoose.connection.name;
        console.log("Connected to Database Name:", dbName);
        
        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections in DB:", collections.map(c => c.name));
        
        await mongoose.disconnect();
        console.log("Disconnected successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Database connection failed!");
        console.error(err);
        process.exit(1);
    }
}

testConnection();
