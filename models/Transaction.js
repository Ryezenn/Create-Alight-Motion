const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    refNo: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    planType: {
        type: String,
        enum: ['monthly', 'lifetime'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'expired', 'failed'],
        default: 'pending'
    },
    qrUrl: {
        type: String
    },
    paymentLink: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    settledAt: {
        type: Date
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
