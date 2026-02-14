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

// ✅ NEW: Update avatar
// PUT /api/users/avatar
router.put('/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.userId;

    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Avatar data is required'
      });
    }

    // Validate base64 image or emoji
    const isBase64Image = avatar.startsWith('data:image/');
    const isEmoji = avatar.length <= 10; // emojis are short

    if (!isBase64Image && !isEmoji) {
      return res.status(400).json({
        success: false,
        error: 'Invalid avatar format. Must be base64 image or emoji.'
      });
    }

    // Check size (max 500KB for base64)
    if (isBase64Image) {
      const sizeInBytes = (avatar.length * 3) / 4;
      const sizeInKB = sizeInBytes / 1024;

      if (sizeInKB > 500) {
        return res.status(400).json({
          success: false,
          error: 'Avatar image too large. Maximum size is 500KB.'
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatar },
      { new: true, select: '-password -encryptedPrivateKey' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`✅ User ${user.email} updated avatar`);

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('❌ Error updating avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update avatar'
    });
  }
});

module.exports = router;