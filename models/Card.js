const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 500
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    city: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    viewCount: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Card', cardSchema);
