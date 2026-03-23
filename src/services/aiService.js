import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const auth = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const aiService = {
    checkHealth: () =>
        axios.get(`${API_URL}/ai/health`, { headers: auth() }).then(r => r.data),

    chat: (messages, model) =>
        axios.post(`${API_URL}/ai/chat`, { messages, model }, { headers: auth() }).then(r => r.data),

    chatStream: async (messages, model, onToken, onDone, onError) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/ai/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ messages, model }),
            });
            if (!res.ok) throw new Error('Stream failed');
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = dec.decode(value).split('\n').filter(l => l.startsWith('data: '));
                for (const line of lines) {
                    const raw = line.slice(6).trim();
                    if (raw === '[DONE]') { onDone?.(); return; }
                    try {
                        const j = JSON.parse(raw);
                        if (j.error) { onError?.(j.error); return; }
                        if (j.token) onToken?.(j.token);
                        if (j.done) { onDone?.(); return; }
                    } catch (_) { }
                }
            }
            onDone?.();
        } catch (e) { onError?.(e.message); }
    },

    summarize: (messages, model) =>
        axios.post(`${API_URL}/ai/summarize`, { messages, model }, { headers: auth() }).then(r => r.data),

    translate: (text, targetLanguage, model) =>
        axios.post(`${API_URL}/ai/translate`, { text, targetLanguage, model }, { headers: auth() }).then(r => r.data),

    smartReply: (lastMessage, context, model) =>
        axios.post(`${API_URL}/ai/smart-reply`, { lastMessage, context, model }, { headers: auth() }).then(r => r.data),
};

export default aiService;