const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Helper: call Ollama generate API
async function ollamaGenerate(prompt) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: false,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
}

// @route  POST /api/ai/smart-reply
// @desc   Generate smart reply suggestions for a conversation
// @access Private
router.post('/smart-reply', authMiddleware, async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'Messages array is required' });
        }

        // Build conversation context from last 5 messages
        const context = messages
            .slice(-5)
            .map((m) => `${m.isOwn ? 'Me' : 'Other'}: ${m.text}`)
            .join('\n');

        const prompt = `You are a helpful assistant generating short chat reply suggestions.

Conversation:
${context}

Generate exactly 3 short, natural reply suggestions for "Me" to send next.
Rules:
- Each reply must be on its own line
- No numbering, no bullet points, no labels
- Keep each reply under 15 words
- Match the tone of the conversation
- Only output the 3 replies, nothing else

Replies:`;

        const raw = await ollamaGenerate(prompt);

        const suggestions = raw
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .slice(0, 3);

        res.json({ success: true, suggestions });
    } catch (error) {
        console.error('❌ Smart reply error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to generate smart replies', details: error.message });
    }
});

// @route  POST /api/ai/summarize
// @desc   Summarize a conversation
// @access Private
router.post('/summarize', authMiddleware, async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'Messages array is required' });
        }

        const context = messages
            .map((m) => `${m.isOwn ? 'Me' : 'Other'}: ${m.text}`)
            .join('\n');

        const prompt = `Summarize the following chat conversation in 2-3 sentences. Be concise and capture the key points discussed.

Conversation:
${context}

Summary:`;

        const summary = await ollamaGenerate(prompt);

        res.json({ success: true, summary });
    } catch (error) {
        console.error('❌ Summarize error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to summarize conversation', details: error.message });
    }
});

// @route  GET /api/ai/status
// @desc   Check if Ollama is running and model is available
// @access Private
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) throw new Error('Ollama not reachable');

        const data = await response.json();
        const models = (data.models || []).map((m) => m.name);
        const modelAvailable = models.some((m) => m.startsWith(OLLAMA_MODEL));

        res.json({
            success: true,
            ollamaRunning: true,
            model: OLLAMA_MODEL,
            modelAvailable,
            availableModels: models,
        });
    } catch (error) {
        res.json({
            success: false,
            ollamaRunning: false,
            error: error.message,
        });
    }
});

module.exports = router;