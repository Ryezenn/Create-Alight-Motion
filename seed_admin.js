require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI tidak ditemukan di file .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('[Seed] ✅ Terhubung ke database MongoDB.');

        const adminUsername = process.argv[2] || 'admin';
        const adminPassword = process.argv[3] || 'admin123456';

        const existingUser = await User.findOne({ username: adminUsername.toLowerCase().trim() });

        if (existingUser) {
            existingUser.role = 'admin';
            existingUser.password = adminPassword;
            existingUser.status = 'active';
            existingUser.credits = 999999;
            await existingUser.save();
            console.log(`==================================================`);
            console.log(`✅ AKUN ADMIN BERHASIL DIPERBARUI!`);
            console.log(`   Username : ${adminUsername}`);
            console.log(`   Password : ${adminPassword}`);
            console.log(`   Role     : admin (Unlimited Credits)`);
            console.log(`==================================================`);
        } else {
            const newAdmin = new User({
                username: adminUsername.toLowerCase().trim(),
                password: adminPassword,
                role: 'admin',
                credits: 999999,
                status: 'active'
            });
            await newAdmin.save();
            console.log(`==================================================`);
            console.log(`🚀 AKUN ADMIN BARU BERHASIL DIBUAT!`);
            console.log(`   Username : ${adminUsername}`);
            console.log(`   Password : ${adminPassword}`);
            console.log(`   Role     : admin (Unlimited Credits)`);
            console.log(`==================================================`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal memproses akun admin:', err);
        process.exit(1);
    }
};

seedAdmin();
