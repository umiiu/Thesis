const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

export async function checkOllamaStatus() {
    try {
        const response = await fetch(`${API_URL}/ai/status`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();
        return { available: data.ollamaRunning || false };
    } catch {
        return { available: false };
    }
}

export async function generateSmartReplies(messages) {
    const cleanMessages = messages.slice(-6).map(m => ({
        isOwn: m.isOwn,
        text: m.text
    }));

    const response = await fetch(`${API_URL}/ai/smart-reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ messages: cleanMessages })
    });

    if (!response.ok) throw new Error('AI request failed');

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'AI request failed');
    return data.suggestions || [];
}

export async function summarizeConversation(messages) {
    const cleanMessages = messages.map(m => ({
        isOwn: m.isOwn,
        text: m.text
    }));

    const response = await fetch(`${API_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ messages: cleanMessages })
    });

    if (!response.ok) throw new Error('AI request failed');

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'AI request failed');
    return data.summary || 'Could not generate summary.';
}