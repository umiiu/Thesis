const express = require('express');
const router = express.Router();
const http = require('http');
const authMiddleware = require('../middleware/authMiddleware');

// Thu tu uu tien model nhe nhat
const LIGHT_MODELS = ['llama3.2:1b', 'gemma3:1b', 'tinyllama', 'phi3:mini'];

function getModels() {
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET' },
            (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('Cannot parse model list')); }
                });
            }
        );
        req.on('error', e => reject(new Error('Ollama not running: ' + e.message)));
        req.end();
    });
}

// Luon chon model nhe nhat de tranh crash RAM
async function getBestModel() {
    try {
        const data = await getModels();
        const installed = (data.models || []).map(m => m.name);
        // Chon theo thu tu uu tien model nhe
        for (const light of LIGHT_MODELS) {
            if (installed.includes(light)) return light;
        }
        // Fallback: chon model co size nho nhat
        if (installed.length > 0) {
            const withSize = (data.models || [])
                .filter(m => m.size)
                .sort((a, b) => a.size - b.size);
            if (withSize.length > 0) return withSize[0].name;
            return installed[0];
        }
        return 'llama3.2:1b';
    } catch (e) {
        return 'llama3.2:1b';
    }
}

function clean(text) {
    let t = String(text || '');
    t = t.replace(/data:[^;]+;base64,[A-Za-z0-9+/=\s]+/g, '[image]');
    if (t.length > 1200) t = t.slice(0, 1200) + '...';
    return t;
}

function ollamaChat(messages, stream = false) {
    return new Promise(async (resolve, reject) => {
        const model = await getBestModel();
        const body = JSON.stringify({ model, messages, stream });
        const req = http.request(
            {
                hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            },
            (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    if (res.statusCode !== 200) return reject(new Error(`Ollama ${res.statusCode}: ${data}`));
                    try { resolve({ json: JSON.parse(data), model }); }
                    catch (e) { reject(new Error('Bad JSON from Ollama')); }
                });
            }
        );
        req.on('error', e => reject(new Error('Ollama connect error: ' + e.message)));
        req.write(body);
        req.end();
    });
}

function ollamaStream(messages, expressRes) {
    return new Promise(async (resolve, reject) => {
        const model = await getBestModel();
        const body = JSON.stringify({ model, messages, stream: true });
        const req = http.request(
            {
                hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            },
            (res) => {
                if (res.statusCode !== 200) {
                    let e = '';
                    res.on('data', c => e += c);
                    res.on('end', () => reject(new Error(`Ollama ${res.statusCode}: ${e}`)));
                    return;
                }
                let buf = '';
                res.on('data', chunk => {
                    buf += chunk.toString();
                    const lines = buf.split('\n');
                    buf = lines.pop();
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const j = JSON.parse(line);
                            expressRes.write(`data: ${JSON.stringify({ token: j.message?.content || '', done: j.done || false })}\n\n`);
                        } catch (_) { }
                    }
                });
                res.on('end', () => {
                    expressRes.write('data: [DONE]\n\n');
                    expressRes.end();
                    resolve();
                });
                res.on('error', reject);
            }
        );
        req.on('error', e => reject(new Error('Ollama connect error: ' + e.message)));
        req.write(body);
        req.end();
    });
}

// GET /api/ai/health
router.get('/health', authMiddleware, async (req, res) => {
    try {
        const data = await getModels();
        const allModels = (data.models || []).map(m => m.name);
        const best = await getBestModel();
        res.json({ success: true, status: 'online', models: allModels, defaultModel: best });
    } catch (e) {
        res.status(503).json({ success: false, status: 'offline', error: 'Ollama chua chay. CMD: ollama serve' });
    }
});

// POST /api/ai/chat
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages?.length) return res.status(400).json({ success: false, error: 'messages required' });
        const sys = { role: 'system', content: 'You are a helpful assistant in SecureChat. Be concise. Reply in same language as user.' };
        const cleaned = messages.map(m => ({ role: m.role, content: clean(m.content) }));
        const { json, model } = await ollamaChat([sys, ...cleaned], false);
        res.json({ success: true, message: json.message?.content || '', model });
    } catch (e) {
        console.error('AI chat:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/ai/chat/stream
router.post('/chat/stream', authMiddleware, async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages?.length) return res.status(400).json({ success: false, error: 'messages required' });
        const sys = { role: 'system', content: 'You are a helpful assistant in SecureChat. Be concise. Reply in same language as user.' };
        const cleaned = messages.map(m => ({ role: m.role, content: clean(m.content) }));
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        await ollamaStream([sys, ...cleaned], res);
    } catch (e) {
        console.error('AI stream:', e.message);
        try { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); res.end(); } catch (_) { }
    }
});

// POST /api/ai/summarize
router.post('/summarize', authMiddleware, async (req, res) => {
    try {
        const { messages: msgs } = req.body;
        if (!msgs?.length) return res.status(400).json({ success: false, error: 'messages required' });
        const recent = msgs.slice(-12).map(m => `${m.sender}: ${String(m.text || '').slice(0, 120)}`).join('\n');
        const { json } = await ollamaChat([{ role: 'user', content: `Summarize in 3-5 sentences:\n\n${recent}` }], false);
        res.json({ success: true, summary: json.message?.content || '' });
    } catch (e) {
        console.error('Summarize:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/ai/translate
router.post('/translate', authMiddleware, async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        if (!text || !targetLanguage) return res.status(400).json({ success: false, error: 'text + targetLanguage required' });
        const { json } = await ollamaChat([{ role: 'user', content: `Translate to ${targetLanguage}. Return ONLY translation:\n\n${String(text).slice(0, 600)}` }], false);
        res.json({ success: true, translation: json.message?.content || '', targetLanguage });
    } catch (e) {
        console.error('Translate:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/ai/smart-reply
router.post('/smart-reply', authMiddleware, async (req, res) => {
    try {
        const { lastMessage, context } = req.body;
        if (!lastMessage) return res.status(400).json({ success: false, error: 'lastMessage required' });

        const ctxText = (context || []).slice(-4)
            .map(m => `${m.sender}: ${String(m.text || '').slice(0, 80)}`).join('\n');

        const prompt = `${ctxText ? ctxText + '\n' : ''}Last message: "${String(lastMessage).slice(0, 150)}"

Give exactly 3 short reply suggestions (under 8 words each).
ONLY return a JSON array, nothing else:
["reply1", "reply2", "reply3"]`;

        const { json } = await ollamaChat([{ role: 'user', content: prompt }], false);
        const raw = json.message?.content || '';

        let replies = [];
        const match = raw.match(/\[[\s\S]*?\]/);
        if (match) {
            try { replies = JSON.parse(match[0]).filter(r => typeof r === 'string' && r.trim()).slice(0, 3); }
            catch (_) { }
        }
        if (replies.length === 0) {
            replies = raw.split('\n')
                .map(l => l.replace(/^[\d.\-*"'\s]+/, '').replace(/["\s]+$/, '').trim()) // eslint-disable-line
                .filter(l => l.length > 1 && l.length < 60)
                .slice(0, 3);
        }
        if (replies.length === 0) replies = ['OK!', 'Got it!', 'Thanks!'];

        res.json({ success: true, replies });
    } catch (e) {
        console.error('Smart reply:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;