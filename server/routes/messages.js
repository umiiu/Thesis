const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/messages/conversation/:userId1/:userId2
// @desc    Get conversation between two users
// @access  Private
router.get('/conversation/:userId1/:userId2', authMiddleware, async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        const messages = await Message.getConversation(userId1, userId2, limit, skip);

        res.json({
            success: true,
            count: messages.length,
            messages: messages.reverse()
        });

    } catch (error) {
        console.error('❌ Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load conversation'
        });
    }
});

// @route   GET /api/messages/unread/:userId
// @desc    Get unread message count
// @access  Private
router.get('/unread/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const unreadCount = await Message.getUnreadCount(userId);

        res.json({
            success: true,
            unreadCount
        });

    } catch (error) {
        console.error('❌ Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unread count'
        });
    }
});

// @route   POST /api/messages
// @desc    Send a message (REST API alternative to WebSocket)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    try {
        const senderId = req.userId;
        const {
            recipientId,
            encryptedContent,
            iv,
            encryptedKey,
            // Self-encrypted fields (for sender to read later)
            selfEncryptedContent,
            selfIv,
            selfEncryptedKey
        } = req.body;

        if (!recipientId || !encryptedContent || !iv || !encryptedKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const message = new Message({
            sender: senderId,
            recipient: recipientId,
            encryptedContent,
            iv,
            encryptedKey,
            // Save self-encrypted version (optional)
            selfEncryptedContent: selfEncryptedContent || null,
            selfIv: selfIv || null,
            selfEncryptedKey: selfEncryptedKey || null
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name avatar')
            .populate('recipient', 'name avatar');

        res.status(201).json({
            success: true,
            message: populatedMessage
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

module.exports = router;