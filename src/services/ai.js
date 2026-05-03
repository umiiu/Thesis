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

    const prompt = 'You are a chat assistant for a messaging app.\n\n'
        + 'Conversation:\n'
        + recentMessages
        + '\n\nTask: Generate EXACTLY 3 short reply suggestions for "Me".\n\n'
        + 'Requirements:\n'
        + '- Write EXACTLY 3 replies, each on its own line\n'
        + '- Use ' + lang + ' language ONLY\n'
        + '- Each reply must be under 12 words\n'
        + '- No numbers, no bullets, no dashes, no labels\n'
        + '- Sound casual and natural like a real person texting\n'
        + '- Each reply should be different in tone or content\n\n'
        + 'Output 3 lines only, nothing else:';

    const raw = await callGemini(prompt, 300);

    const suggestions = raw
        .split('\n')
        .map(function (l) { return l.replace(/^[\d.\-*\[\]\s]+/, '').trim(); })
        .filter(function (l) { return l.length > 0 && l.length < 100; })
        .slice(0, 3);

    if (suggestions.length === 0) {
        return lang === 'Vietnamese'
            ? ['Được rồi!', 'Tôi hiểu rồi.', 'Cho tôi biết thêm nhé.']
            : ['Sounds good!', 'I understand.', 'Tell me more.'];
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