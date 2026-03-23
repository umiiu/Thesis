const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const { encryptPrivateKey } = require('../utils/encryption');

const JWT_SECRET = process.env.JWT_SECRET || 'secure-chat-secret';

// Generate RSA key pair (for end-to-end encryption)
function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
}

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email exists' });
    }

    // ✅ 1. Generate RSA key pair
    const { publicKey, privateKey } = generateRSAKeyPair();
    console.log('🔐 Generated RSA keys');

    // ✅ 2. Encrypt private key với password của user
    const encryptedPrivateKey = encryptPrivateKey(privateKey, password);
    console.log('✅ Encrypted private key with user password');

    // ✅ 3. Create user (password sẽ tự động hash bởi pre-save hook)
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      publicKey,
      encryptedPrivateKey // ✅ Lưu encrypted version
    });

    await user.save();
    console.log('✅ User created:', user.email);

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ 4. Trả về encryptedPrivateKey để frontend tự giải mã
    res.status(201).json({
      success: true,
      token,
      user: user.toAuthJSON(), // ✅ Có encryptedPrivateKey
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in:', user.email);

    // ✅ Trả về encryptedPrivateKey để frontend tự giải mã
    res.json({
      success: true,
      token,
      user: user.toAuthJSON(), // ✅ Có encryptedPrivateKey
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ================= LOGOUT =================
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
    }
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// ================= VERIFY TOKEN =================
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, userId: decoded.userId });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

module.exports = router;