// ==================== GEMINI AI SERVICE ====================
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
    GEMINI_API_KEY;

// ==================== CORE API CALL ====================

async function callGemini(prompt, maxTokens) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured.');
    }

    const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: maxTokens || 512,
            },
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Gemini error ' + res.status);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ==================== LANGUAGE DETECTION ====================

function detectLanguage(messages) {
    const allText = messages.map((m) => m.text).join(' ');
    const vietDiacritics =
        /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
    const vietWords =
        /\b(oi|nhe|khong|duoc|roi|ban|minh|toi|vay|sao|nao|thoi|xong|chao|cam)\b/i;
    if (vietDiacritics.test(allText)) return 'Vietnamese';
    if (vietWords.test(allText)) return 'Vietnamese';
    return 'English';
}

// ==================== PARSE 3 REPLIES ====================

function extractThreeReplies(raw, fallbacks) {
    console.log('[AI] raw output:', JSON.stringify(raw));

    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();

    // Match lines starting with 1. 2. 3. (or 1) 2) 3))
    const results = [];
    for (const line of cleaned.split('\n')) {
        const m = line.match(/^\s*([123])[.)]\s*(.+)$/);
        if (m) {
            const num = parseInt(m[1]);
            results[num - 1] = m[2].trim();
        }
    }

    // Fill slots that are still empty
    for (let i = 0; i < 3; i++) {
        if (!results[i]) results[i] = fallbacks[i];
    }

    console.log('[AI] final replies:', results.slice(0, 3));
    return results.slice(0, 3);
}

// ==================== CHECK AI STATUS ====================

export async function checkAIStatus() {
    return { available: !!GEMINI_API_KEY };
}

// ==================== SMART REPLY ====================

export async function generateSmartReplies(messages) {
    const lang = detectLanguage(messages);

    const fallbacks =
        lang === 'Vietnamese'
            ? ['Được rồi!', 'Ok bạn ơi!', 'Ừ, mình hiểu rồi!']
            : ['Sounds good!', 'Got it!', 'Sure, no problem!'];

    const ctx = messages
        .slice(-4)
        .map((m) => (m.isOwn ? 'Me' : 'Friend') + ': ' + m.text)
        .join('\n');

    const prompt =
        'Given this chat conversation, write 3 reply options for "Me" in ' + lang + '.\n' +
        'Each reply must be short (under 10 words) and on its own numbered line.\n' +
        'Respond with exactly these 3 lines and nothing else:\n' +
        '1. <reply here>\n' +
        '2. <reply here>\n' +
        '3. <reply here>\n\n' +
        'Conversation:\n' + ctx;

    try {
        const raw = await callGemini(prompt, 500);
        return extractThreeReplies(raw, fallbacks);
    } catch (err) {
        console.error('[AI] generateSmartReplies error:', err);
        return fallbacks;
    }
}

// ==================== CONVERSATION SUMMARY ====================

export async function summarizeConversation(messages) {
    const lang = detectLanguage(messages);

    const ctx = messages
        .map((m) => (m.isOwn ? 'Me' : 'Friend') + ': ' + m.text)
        .join('\n');

    const prompt =
        'Summarize this chat in 2-3 sentences in ' + lang + '. No bullet points.\n\n' +
        ctx + '\n\nSummary:';

    try {
        return await callGemini(prompt, 500);
    } catch (err) {
        console.error('[AI] summarizeConversation error:', err);
        return lang === 'Vietnamese'
            ? 'Không thể tạo tóm tắt. Vui lòng thử lại.'
            : 'Unable to generate summary. Please try again.';
    }
}
