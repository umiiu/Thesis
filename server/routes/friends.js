const express = require('express');
const router = express.Router();
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// ==================== SEND FRIEND REQUEST ====================
// POST /api/friends/request/:userId
router.post('/request/:userId', async (req, res) => {
    try {
        const requesterId = req.userId; // từ authMiddleware
        const recipientId = req.params.userId;

        // Validate
        if (requesterId === recipientId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot send friend request to yourself'
            });
        }

        // Kiểm tra recipient có tồn tại không
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Gửi lời mời
        const friendship = await Friendship.sendRequest(requesterId, recipientId);

        res.status(201).json({
            success: true,
            message: 'Friend request sent',
            friendship
        });

    } catch (error) {
        console.error('❌ Send friend request error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to send friend request'
        });
    }
});

// ==================== ACCEPT FRIEND REQUEST ====================
// POST /api/friends/accept/:userId
router.post('/accept/:userId', async (req, res) => {
    try {
        const recipientId = req.userId; // người nhận (đang chấp nhận)
        const requesterId = req.params.userId; // người gửi

        const friendship = await Friendship.acceptRequest(requesterId, recipientId);

        res.json({
            success: true,
            message: 'Friend request accepted',
            friendship
        });

    } catch (error) {
        console.error('❌ Accept friend request error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to accept friend request'
        });
    }
});

// ==================== DECLINE FRIEND REQUEST ====================
// POST /api/friends/decline/:userId
router.post('/decline/:userId', async (req, res) => {
    try {
        const recipientId = req.userId;
        const requesterId = req.params.userId;

        const friendship = await Friendship.declineRequest(requesterId, recipientId);

        res.json({
            success: true,
            message: 'Friend request declined',
            friendship
        });

    } catch (error) {
        console.error('❌ Decline friend request error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to decline friend request'
        });
    }
});

// ==================== CANCEL FRIEND REQUEST ====================
// DELETE /api/friends/request/:userId
router.delete('/request/:userId', async (req, res) => {
    try {
        const requesterId = req.userId;
        const recipientId = req.params.userId;

        await Friendship.cancelRequest(requesterId, recipientId);

        res.json({
            success: true,
            message: 'Friend request cancelled'
        });

    } catch (error) {
        console.error('❌ Cancel friend request error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to cancel friend request'
        });
    }
});

// ==================== UNFRIEND ====================
// DELETE /api/friends/:userId
router.delete('/:userId', async (req, res) => {
    try {
        const userId1 = req.userId;
        const userId2 = req.params.userId;

        await Friendship.removeFriend(userId1, userId2);

        res.json({
            success: true,
            message: 'Unfriended successfully'
        });

    } catch (error) {
        console.error('❌ Unfriend error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to unfriend'
        });
    }
});

// ==================== GET FRIENDS LIST ====================
// GET /api/friends
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const friends = await Friendship.getFriends(userId);

        res.json({
            success: true,
            count: friends.length,
            friends
        });

    } catch (error) {
        console.error('❌ Get friends error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get friends list'
        });
    }
});

// ==================== GET RECEIVED REQUESTS ====================
// GET /api/friends/requests/received
router.get('/requests/received', async (req, res) => {
    try {
        const userId = req.userId;
        const requests = await Friendship.getReceivedRequests(userId);

        res.json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error('❌ Get received requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get received requests'
        });
    }
});

// ==================== GET SENT REQUESTS ====================
// GET /api/friends/requests/sent
router.get('/requests/sent', async (req, res) => {
    try {
        const userId = req.userId;
        const requests = await Friendship.getSentRequests(userId);

        res.json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error('❌ Get sent requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sent requests'
        });
    }
});

// ==================== GET PENDING REQUEST COUNT ====================
// GET /api/friends/requests/count
router.get('/requests/count', async (req, res) => {
    try {
        const userId = req.userId;
        const count = await Friendship.countPendingRequests(userId);

        res.json({
            success: true,
            count
        });

    } catch (error) {
        console.error('❌ Get request count error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get request count'
        });
    }
});

// ==================== GET FRIENDSHIP STATUS ====================
// GET /api/friends/status/:userId
router.get('/status/:userId', async (req, res) => {
    try {
        const userId1 = req.userId;
        const userId2 = req.params.userId;

        const status = await Friendship.getStatus(userId1, userId2);

        res.json({
            success: true,
            ...status
        });

    } catch (error) {
        console.error('❌ Get friendship status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get friendship status'
        });
    }
});

// ==================== SEARCH NON-FRIENDS ====================
// GET /api/friends/search?q=keyword
router.get('/search', async (req, res) => {
    try {
        const userId = req.userId;
        const query = req.query.q || '';

        // Lấy danh sách bạn bè hiện tại
        const friends = await Friendship.getFriends(userId);
        const friendIds = friends.map(f => f._id.toString());

        // Lấy pending requests
        const sentRequests = await Friendship.getSentRequests(userId);
        const sentIds = sentRequests.map(r => r._id.toString());

        const receivedRequests = await Friendship.getReceivedRequests(userId);
        const receivedIds = receivedRequests.map(r => r._id.toString());

        // Search users (không bao gồm bạn bè, pending, và chính mình)
        const excludeIds = [userId, ...friendIds, ...sentIds, ...receivedIds];

        const users = await User.find({
            _id: { $nin: excludeIds },
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
            .select('name email avatar status lastSeen publicKey')
            .limit(20);

        res.json({
            success: true,
            count: users.length,
            users: users.map(u => u.toPublicJSON())
        });

    } catch (error) {
        console.error('❌ Search users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search users'
        });
    }
});

module.exports = router;