const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + GEMINI_API_KEY;

async function callGemini(prompt, maxTokens) {
    const tokens = maxTokens || 300;
    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: tokens,
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function detectLanguage(messages) {
    const hasVietnameseDiacritics = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
    const vietnameseWords = /\b(oi|ong|nhe|khong|ranh|duoc|roi|ban|minh|toi|di|vay|sao|gi|nao|den|ve|la|va|thi|ma|hay|nhung|voi|cho|cung|da|se|dang|muon|biet|noi|lam|xem|nghi|nay|kia|day|nua|thoi|xong|chao|cam|on)\b/i;
    const allText = messages.map(function (m) { return m.text; }).join(' ');
    if (hasVietnameseDiacritics.test(allText)) return 'Vietnamese';
    if (vietnameseWords.test(allText)) return 'Vietnamese';
    return 'English';
}

export async function checkAIStatus() {
    return { available: !!GEMINI_API_KEY };
}

export async function generateSmartReplies(messages) {
    const recentMessages = messages.slice(-5)
        .map(function (m) { return (m.isOwn ? 'Me' : 'Friend') + ': ' + m.text; })
        .join('\n');

    const lang = detectLanguage(messages);

    const prompt = 'You are a chat assistant. Based on this conversation, generate exactly 3 short reply suggestions for "Me".\n\n'
        + 'Conversation:\n'
        + recentMessages
        + '\n\nRules:\n'
        + '- Output ONLY 3 lines, one reply per line\n'
        + '- Use ' + lang + ' language\n'
        + '- Each reply must be under 15 words\n'
        + '- No numbering, no bullets, no extra text\n'
        + '- Make each reply different in tone\n\n'
        + 'Reply 1:\nReply 2:\nReply 3:';

    const raw = await callGemini(prompt, 150);  // ← tăng lên 150

    // Parse "Reply 1: ...", "Reply 2: ...", "Reply 3: ..." format
    const lines = raw.split('\n');
    const suggestions = [];

    for (const line of lines) {
        // Strip "Reply N:" prefix nếu có, hoặc lấy thẳng dòng text
        const cleaned = line
            .replace(/^Reply\s*\d+\s*:\s*/i, '')
            .replace(/^[\d.\-*]+\s*/, '')
            .trim();
        if (cleaned.length > 0 && cleaned.length < 120) {
            suggestions.push(cleaned);
        }
        if (suggestions.length === 3) break;
    }

    // Fallback nếu parse không đủ 3
    const fallbacks = lang === 'Vietnamese'
        ? ['Được rồi!', 'Tôi hiểu rồi.', 'Cho tôi biết thêm nhé.']
        : ['Sounds good!', 'Got it, thanks!', 'Tell me more.'];

    while (suggestions.length < 3) {
        suggestions.push(fallbacks[suggestions.length]);
    }

    return suggestions;
}

export async function summarizeConversation(messages) {
    const context = messages
        .map(function (m) { return (m.isOwn ? 'Me' : 'Friend') + ': ' + m.text; })
        .join('\n');

    const lang = detectLanguage(messages);

    const prompt = 'Summarize this chat conversation in 2-3 complete sentences in ' + lang + '.\n'
        + 'Focus on: main topics discussed, decisions made, action items.\n'
        + 'Be concise and natural. Write complete sentences only.\n\n'
        + 'Conversation:\n'
        + context
        + '\n\nSummary:';

    return await callGemini(prompt, 500);
}