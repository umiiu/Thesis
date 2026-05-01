const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ name: 1 }).lean();
    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        publicKey: u.publicKey,
        avatar: u.avatar,
        status: u.status,
        lastSeen: u.lastSeen
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Search users by name or email
router.get('/search/:query', authMiddleware, async (req, res) => {
  try {
    const query = req.params.query.trim();
    const currentUserId = req.userId;

    if (!query || query.length < 1) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }, '-password').limit(20).lean();

    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        avatar: u.avatar && (u.avatar.startsWith('data:image/') || u.avatar.length <= 10)
          ? u.avatar : '👤',
        status: u.status,
        lastSeen: u.lastSeen
      }))
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// Fix corrupted avatars
router.post('/fix-avatars', async (req, res) => {
  try {
    const users = await User.find({});
    let fixed = 0;

    for (const user of users) {
      const avatar = user.avatar;

      // Avatar hợp lệ: không có, hoặc là emoji (ngắn), hoặc là base64 image
      const isValid = !avatar ||
        avatar.startsWith('data:image/') ||
        (avatar.length <= 10 && !avatar.includes('/') && !avatar.includes('+'));

      if (!isValid) {
        await User.findByIdAndUpdate(user._id, { $set: { avatar: '👤' } });
        fixed++;
        console.log(`✅ Fixed avatar for: ${user.email} (was ${avatar.substring(0, 30)}...)`);
      }
    }

    res.json({ success: true, message: `Fixed ${fixed} corrupted avatars` });
  } catch (error) {
    console.error('Fix error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Update avatar
router.put('/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.userId;

    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({ success: false, error: 'Avatar data is required' });
    }

    const isBase64Image = avatar.startsWith('data:image/');
    const isEmoji = avatar.length <= 10;

    if (!isBase64Image && !isEmoji) {
      return res.status(400).json({ success: false, error: 'Invalid avatar format.' });
    }

    if (isBase64Image) {
      const sizeInKB = (avatar.length * 3) / 4 / 1024;
      if (sizeInKB > 500) {
        return res.status(400).json({ success: false, error: 'Avatar too large. Max 500KB.' });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true, select: '-password' }
    );

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('❌ Error updating avatar:', error);
    res.status(500).json({ success: false, error: 'Failed to update avatar' });
  }
});

module.exports = router;