const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// AI is now handled client-side via Gemini API
// These routes are kept as stubs for compatibility

// @route  POST /api/ai/smart-reply
router.post('/smart-reply', authMiddleware, async (req, res) => {
    res.json({ success: false, error: 'AI is now processed client-side' });
});

// @route  POST /api/ai/summarize
router.post('/summarize', authMiddleware, async (req, res) => {
    res.json({ success: false, error: 'AI is now processed client-side' });
});

// @route  GET /api/ai/status
router.get('/status', authMiddleware, async (req, res) => {
    res.json({
        success: true,
        status: 'AI processed client-side via Gemini',
        ollamaRunning: false,
    });
});

module.exports = router;