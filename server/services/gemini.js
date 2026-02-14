const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==================== SMART REPLY ====================
// Generate smart reply suggestions based on message

async function generateSmartReplies(message, conversationContext = []) {
    try {
        // Use Gemini 2.5 Flash (stable, fast, free)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build context from recent messages (last 5)
        const contextText = conversationContext
            .slice(-5)
            .map(msg => `${msg.isOwn ? 'You' : 'Friend'}: ${msg.text}`)
            .join('\n');

        const prompt = `You are a helpful assistant generating smart reply suggestions for a chat application.

Context (recent conversation):
${contextText || 'No previous context'}

Latest message from friend: "${message}"

Generate 3 short, natural reply suggestions that:
1. Are relevant to the message and context
2. Sound natural and conversational
3. Vary in tone (casual, friendly, professional)
4. Are under 100 characters each
5. Match the language of the incoming message

Format your response as JSON array of strings:
["reply1", "reply2", "reply3"]

Only return the JSON array, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const cleanText = text.trim().replace(/```json|```/g, '').trim();
        const replies = JSON.parse(cleanText);

        // Validate and limit to 3 replies
        if (!Array.isArray(replies)) {
            throw new Error('Invalid response format');
        }

        return {
            success: true,
            replies: replies.slice(0, 3)
        };

    } catch (error) {
        console.error('❌ Gemini Smart Reply error:', error);

        // Fallback to simple replies if API fails
        return {
            success: false,
            error: error.message,
            replies: [
                "Thanks for your message!",
                "I'll get back to you soon.",
                "Sounds good!"
            ]
        };
    }
}

// ==================== MESSAGE SUMMARIZATION ====================
// Summarize conversation messages

async function summarizeConversation(messages, options = {}) {
    try {
        const {
            maxLength = 200,
            includeTopics = true,
            includeKeyPoints = true
        } = options;

        // Use Gemini 2.5 Flash (stable, fast, free)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build conversation text
        const conversationText = messages
            .map(msg => {
                const sender = msg.isOwn ? 'You' : 'Friend';
                const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `[${time}] ${sender}: ${msg.text}`;
            })
            .join('\n');

        const prompt = `You are a helpful assistant summarizing chat conversations.

Conversation (${messages.length} messages):
${conversationText}

Generate a concise summary that includes:
${includeTopics ? '- Main topics discussed' : ''}
${includeKeyPoints ? '- Key points or decisions' : ''}
- Important dates or times mentioned
- Action items (if any)

Keep the summary under ${maxLength} words and be objective.
Use bullet points for clarity.

Format your response as JSON:
{
  "summary": "Overall summary text",
  "topics": ["topic1", "topic2"],
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"],
  "mentions": {
    "dates": ["date1"],
    "times": ["time1"]
  }
}

Only return the JSON object, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const cleanText = text.trim().replace(/```json|```/g, '').trim();
        const summaryData = JSON.parse(cleanText);

        return {
            success: true,
            summary: summaryData
        };

    } catch (error) {
        console.error('❌ Gemini Summarization error:', error);

        return {
            success: false,
            error: error.message,
            summary: {
                summary: 'Unable to generate summary at this time.',
                topics: [],
                keyPoints: [],
                actionItems: [],
                mentions: { dates: [], times: [] }
            }
        };
    }
}

// ==================== HEALTH CHECK ====================
// Test Gemini API connection

async function testConnection() {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('Say "Hello" in one word.');
        const response = await result.response;
        const text = response.text();

        return {
            success: true,
            message: 'Gemini API connected successfully',
            response: text
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    generateSmartReplies,
    summarizeConversation,
    testConnection
};