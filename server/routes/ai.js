const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { generateSmartReplies, summarizeConversation, testConnection } = require('../services/gemini');

// All AI routes require authentication
router.use(authMiddleware);

// ==================== SMART REPLY ====================
// POST /api/ai/smart-reply
// Generate smart reply suggestions for a message

router.post('/smart-reply', async (req, res) => {
    try {
        const { message, conversationContext } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log('🤖 Generating smart replies for:', message.substring(0, 50) + '...');

        const result = await generateSmartReplies(message, conversationContext || []);

        res.json(result);

    } catch (error) {
        console.error('❌ Smart reply error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate smart replies',
            replies: [
                "Thanks for your message!",
                "I'll get back to you soon.",
                "Sounds good!"
            ]
        });
    }
});

// ==================== SUMMARIZATION ====================
// POST /api/ai/summarize
// Summarize a conversation

router.post('/summarize', async (req, res) => {
    try {
        const { messages, options } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Messages array is required'
            });
        }

        console.log(`📝 Summarizing conversation with ${messages.length} messages...`);

        const result = await summarizeConversation(messages, options || {});

        res.json(result);

    } catch (error) {
        console.error('❌ Summarization error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate summary',
            summary: {
                summary: 'Unable to generate summary at this time.',
                topics: [],
                keyPoints: [],
                actionItems: [],
                mentions: { dates: [], times: [] }
            }
        });
    }
});

// ==================== HEALTH CHECK ====================
// GET /api/ai/health
// Test Gemini API connection

router.get('/health', async (req, res) => {
    try {
        const result = await testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;