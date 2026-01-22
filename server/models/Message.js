const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Encrypted message content (for RECIPIENT)
    encryptedContent: {
        type: String,
        required: true
    },
    // Initialization Vector for AES encryption
    iv: {
        type: String,
        required: true
    },
    // Encrypted AES key (encrypted with recipient's RSA public key)
    encryptedKey: {
        type: String,
        required: true
    },
    // ADDED: Encrypted message content (for SENDER to read later)
    selfEncryptedContent: {
        type: String,
        required: false
    },
    selfIv: {
        type: String,
        required: false
    },
    selfEncryptedKey: {
        type: String,
        required: false
    },
    // Message status
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
        index: true
    },
    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    // When message was read
    readAt: {
        type: Date
    },
    // AI processing flag
    aiProcessed: {
        type: Boolean,
        default: false
    },
    // Encrypted AI-generated data (summary, translation)
    aiData: {
        encryptedSummary: String,
        encryptedTranslation: String,
        language: String
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
MessageSchema.index({ sender: 1, recipient: 1, timestamp: -1 });
MessageSchema.index({ recipient: 1, status: 1 });
MessageSchema.index({ sender: 1, timestamp: -1 });
MessageSchema.index({ recipient: 1, timestamp: -1 });

// Static method: Get conversation between two users
MessageSchema.statics.getConversation = async function (userId1, userId2, limit = 50, skip = 0) {
    return this.find({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ]
    })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('sender', 'name avatar email')
        .populate('recipient', 'name avatar email');
};

// Static method: Get unread message count
MessageSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({
        recipient: userId,
        status: { $ne: 'read' }
    });
};

// Static method: Mark messages as read
MessageSchema.statics.markAsRead = async function (senderId, recipientId) {
    return this.updateMany(
        {
            sender: senderId,
            recipient: recipientId,
            status: { $ne: 'read' }
        },
        {
            status: 'read',
            readAt: new Date()
        }
    );
};

module.exports = mongoose.model('Message', MessageSchema);