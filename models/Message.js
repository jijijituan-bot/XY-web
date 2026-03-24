const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromUsername: {
        type: String,
        required: true
    },
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toUsername: {
        type: String,
        required: true
    },
    cardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 500
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);
