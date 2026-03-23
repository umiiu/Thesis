import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Loader, AlertCircle, Sparkles } from 'lucide-react';
import aiService from '../services/aiService';
import './AIAssistant.css';

export default function AIAssistant({ currentMessages = [], selectedChat }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [msgs, setMsgs] = useState([{
        role: 'assistant',
        content: '👋 Xin chào! Tôi là AI Assistant của SecureChat. Hỏi tôi bất cứ điều gì, hoặc dùng nút bên dưới để tóm tắt hội thoại!',
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState('');
    const [status, setStatus] = useState(null); // 'online'|'offline'
    const [bestModel, setBestModel] = useState('');
    const endRef = useRef(null);

    useEffect(() => { if (isOpen) checkHealth(); }, [isOpen]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, streaming]);

    const checkHealth = async () => {
        try {
            const d = await aiService.checkHealth();
            setStatus('online');
            // Luon dung model tot nhat (nhe nhat) tu backend
            setBestModel(d.defaultModel || '');
        } catch {
            setStatus('offline');
        }
    };

    const send = async (text) => {
        const t = (text || input).trim();
        if (!t || loading) return;
        setInput('');
        const newMsgs = [...msgs, { role: 'user', content: t }];
        setMsgs(newMsgs);
        setLoading(true);
        setStreaming('');

        const apiMsgs = newMsgs.slice(1).map(m => ({ role: m.role, content: m.content }));
        let acc = '';

        try {
            await aiService.chatStream(apiMsgs, bestModel,
                (token) => { acc += token; setStreaming(acc); },
                () => {
                    setMsgs(p => [...p, { role: 'assistant', content: acc }]);
                    setStreaming(''); setLoading(false);
                },
                (err) => {
                    setMsgs(p => [...p, { role: 'assistant', content: `❌ Lỗi: ${err}`, isError: true }]);
                    setStreaming(''); setLoading(false);
                }
            );
        } catch (e) {
            setMsgs(p => [...p, { role: 'assistant', content: `❌ ${e.message}`, isError: true }]);
            setStreaming(''); setLoading(false);
        }
    };

    const summarize = async () => {
        const valid = currentMessages.filter(m =>
            m.text && m.text.trim() && !m.text.startsWith('data:') &&
            !m.text.includes('[Encrypted') && !m.text.includes('[Cannot decrypt')
        );
        if (valid.length === 0) {
            setMsgs(p => [...p,
            { role: 'user', content: '📝 Tóm tắt hội thoại' },
            { role: 'assistant', content: 'Chưa có tin nhắn nào để tóm tắt.' }
            ]); return;
        }
        setLoading(true);
        try {
            const trimmed = valid.slice(-15).map(m => ({
                sender: m.sender || 'User',
                text: String(m.text || '').slice(0, 120)
            }));
            const d = await aiService.summarize(trimmed, bestModel);
            setMsgs(p => [...p,
            { role: 'user', content: `📝 Tóm tắt hội thoại với ${selectedChat?.name || 'người dùng'}` },
            { role: 'assistant', content: d.summary || 'Không thể tóm tắt.' }
            ]);
        } catch (e) {
            setMsgs(p => [...p, { role: 'assistant', content: `❌ Lỗi tóm tắt: ${e.message}`, isError: true }]);
        } finally { setLoading(false); }
    };

    if (!isOpen) return (
        <button className="ai-fab" onClick={() => setIsOpen(true)} title="AI Assistant">
            <Bot size={22} /><span className="ai-fab-label">AI</span>
        </button>
    );

    return (
        <div className={`ai-panel ${isMinimized ? 'minimized' : ''}`}>
            <div className="ai-header">
                <div className="ai-header-left">
                    <Bot size={18} /><span>AI Assistant</span>
                    {status === 'online' && <span className="ai-status online">● Online</span>}
                    {status === 'offline' && <span className="ai-status offline">● Offline</span>}
                    {bestModel && status === 'online' && (
                        <span className="ai-model-badge">{bestModel}</span>
                    )}
                </div>
                <div className="ai-header-actions">
                    <button onClick={() => setIsMinimized(v => !v)} className="ai-icon-btn">
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="ai-icon-btn"><X size={14} /></button>
                </div>
            </div>

            {!isMinimized && <>
                {status === 'offline' && (
                    <div className="ai-offline-banner">
                        <AlertCircle size={14} />
                        <span>Ollama chưa chạy. CMD: <code>ollama serve</code></span>
                        <button onClick={checkHealth} className="ai-retry-btn">Thử lại</button>
                    </div>
                )}

                <div className="ai-messages">
                    {msgs.map((m, i) => (
                        <div key={i} className={`ai-msg ${m.role} ${m.isError ? 'error' : ''}`}>
                            {m.role === 'assistant' && <div className="ai-msg-avatar"><Bot size={14} /></div>}
                            <div className="ai-msg-bubble"><p>{m.content}</p></div>
                        </div>
                    ))}
                    {streaming && (
                        <div className="ai-msg assistant">
                            <div className="ai-msg-avatar"><Bot size={14} /></div>
                            <div className="ai-msg-bubble streaming"><p>{streaming}<span className="cursor">▌</span></p></div>
                        </div>
                    )}
                    {loading && !streaming && (
                        <div className="ai-msg assistant">
                            <div className="ai-msg-avatar"><Bot size={14} /></div>
                            <div className="ai-msg-bubble"><div className="ai-dots"><span /><span /><span /></div></div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Quick actions */}
                <div className="ai-quick-bar">
                    {selectedChat && (
                        <button className="ai-quick-btn" onClick={summarize} disabled={loading}>
                            <Sparkles size={12} /> Tóm tắt hội thoại
                        </button>
                    )}
                    <button className="ai-quick-btn" onClick={() => send('Dịch sang tiếng Anh tin nhắn gần nhất')} disabled={loading || status === 'offline'}>
                        🌐 Dịch
                    </button>
                    <button className="ai-quick-btn" onClick={() => send('Giải thích mã hóa E2EE là gì?')} disabled={loading || status === 'offline'}>
                        💡 E2EE là gì?
                    </button>
                </div>

                <div className="ai-input-area">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder={status === 'offline' ? 'Ollama chưa chạy...' : 'Nhập câu hỏi...'}
                        className="ai-textarea"
                        disabled={loading || status === 'offline'}
                        rows={2}
                    />
                    <button onClick={() => send()} className="ai-send-btn"
                        disabled={!input.trim() || loading || status === 'offline'}>
                        {loading ? <Loader size={16} className="spin" /> : <Send size={16} />}
                    </button>
                </div>
            </>}
        </div>
    );
}