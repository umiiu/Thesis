import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile, Image, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './ChatArea.css';
import socketService from '../services/socket';
import { encryptMessage } from '../services/crypto';
import aiService from '../services/aiService';

function ChatArea({ selectedChat, messages, currentUser, onlineUsers, isTyping, onSendMessage }) {
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [smartReplies, setSmartReplies] = useState([]);
    const [loadingSR, setLoadingSR] = useState(false);
    const [srError, setSrError] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiRef = useRef(null);
    const textareaRef = useRef(null);
    const srTimerRef = useRef(null);
    const lastMsgIdRef = useRef(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const handleOut = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
        };
        document.addEventListener('mousedown', handleOut);
        return () => document.removeEventListener('mousedown', handleOut);
    }, []);

    // Auto generate smart reply khi tin nhan cuoi la cua nguoi kia
    useEffect(() => {
        if (!messages || messages.length === 0) { setSmartReplies([]); return; }
        const last = messages[messages.length - 1];
        if (!last || last.isOwn) { setSmartReplies([]); return; }
        // Tranh generate lai neu cung 1 tin nhan
        if (last.id && last.id === lastMsgIdRef.current) return;
        lastMsgIdRef.current = last.id;

        if (srTimerRef.current) clearTimeout(srTimerRef.current);
        srTimerRef.current = setTimeout(() => doSmartReply(last, messages), 1000);
        return () => { if (srTimerRef.current) clearTimeout(srTimerRef.current); };
    }, [messages]);

    const doSmartReply = useCallback(async (last, allMsgs) => {
        const txt = last?.text || '';
        if (!txt || txt.startsWith('data:') || txt.includes('[Encrypted') || txt.includes('[Cannot') || txt.length < 2) {
            setSmartReplies([]); return;
        }
        setLoadingSR(true); setSrError(false); setSmartReplies([]);
        try {
            const ctx = allMsgs.slice(-6, -1)
                .filter(m => m.text && !m.text.startsWith('data:') && !m.text.includes('[Encrypted'))
                .map(m => ({ sender: m.isOwn ? (currentUser?.name || 'Me') : (selectedChat?.name || 'Them'), text: m.text.slice(0, 80) }));
            const d = await aiService.smartReply(txt, ctx);
            if (d.success && d.replies?.length > 0) { setSmartReplies(d.replies); setSrError(false); }
            else setSrError(true);
        } catch { setSrError(true); }
        finally { setLoadingSR(false); }
    }, [currentUser, selectedChat]);

    const retrySmartReply = () => {
        if (!messages?.length) return;
        const last = messages[messages.length - 1];
        if (last && !last.isOwn) doSmartReply(last, messages);
    };

    const handleTyping = () => {
        if (!selectedChat || !currentUser) return;
        socketService.startTyping(currentUser.id, selectedChat.id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => socketService.stopTyping(currentUser.id, selectedChat.id), 1000);
    };

    const handleSend = async (text) => {
        const orig = (text || messageInput).trim();
        if (!orig || !selectedChat || !currentUser || sending) return;
        setSending(true);
        setMessageInput('');
        setSmartReplies([]);
        try {
            socketService.stopTyping(currentUser.id, selectedChat.id);
            const forRecipient = await encryptMessage(orig, selectedChat.publicKey);
            let forSelf = null;
            if (currentUser.publicKey) {
                try { forSelf = await encryptMessage(orig, currentUser.publicKey); } catch (_) { }
            }
            const data = {
                senderId: currentUser.id, recipientId: selectedChat.id,
                encryptedContent: forRecipient.encryptedContent, iv: forRecipient.iv, encryptedKey: forRecipient.encryptedKey,
                selfEncryptedContent: forSelf?.encryptedContent, selfIv: forSelf?.iv, selfEncryptedKey: forSelf?.encryptedKey,
                timestamp: new Date().toISOString(), tempId: `temp_${Date.now()}`
            };
            socketService.sendMessage(data);
            if (onSendMessage) onSendMessage({ ...data, originalText: orig });
        } catch (e) {
            console.error('Send error:', e);
            alert('Failed to send. Please try again.');
            setMessageInput(orig);
        } finally { setSending(false); }
    };

    if (!selectedChat) return <div className="chat-area empty">Select a chat</div>;

    const isOnline = onlineUsers?.has(selectedChat.id);
    const lastMsg = messages[messages.length - 1];
    const showSR = lastMsg && !lastMsg.isOwn;

    return (
        <div className="chat-area">
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className="chat-avatar">{selectedChat.avatar}</div>
                    <div>
                        <h3 className="chat-username">{selectedChat.name}</h3>
                        <div className="chat-status">
                            {isOnline ? <span className="last-visit online">● Online</span> : <span className="last-visit">Offline</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="messages-area">
                {messages.map((msg, i) => (
                    <div key={msg.id || i} className={`message-row ${msg.isOwn ? 'own' : 'other'}`}>
                        <div className="message-content">
                            {!msg.isOwn && <div className="msg-avatar">{selectedChat.avatar}</div>}
                            <div>
                                <div className={`message-bubble ${msg.isOwn ? 'own' : 'other'}`}>
                                    <p>{msg.text}</p>
                                </div>
                                <div className={`message-info ${msg.isOwn ? 'own' : 'other'}`}>
                                    <span className="msg-time">{msg.time}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="message-row other">
                        <div className="message-bubble other">typing...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Smart Reply */}
            {showSR && (
                <div className="smart-reply-bar">
                    <div className="smart-reply-header"><Sparkles size={13} /><span>Smart Replies</span></div>
                    {loadingSR && <div className="smart-reply-loading"><span className="sr-dot" /><span className="sr-dot" /><span className="sr-dot" /></div>}
                    {!loadingSR && srError && (
                        <div className="smart-reply-error">
                            <AlertTriangle size={13} /><span>Failed to generate smart replies</span>
                            <button onClick={retrySmartReply} className="sr-retry-btn"><RefreshCw size={12} /> Retry</button>
                        </div>
                    )}
                    {!loadingSR && !srError && smartReplies.length > 0 && (
                        <div className="smart-reply-chips">
                            {smartReplies.map((r, i) => (
                                <button key={i} className="smart-reply-chip"
                                    onClick={() => { setMessageInput(r); textareaRef.current?.focus(); setSmartReplies([]); }}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="smart-reply-footer">🔒 Processed locally - Your privacy is protected</div>
                </div>
            )}

            <div className="input-area">
                <div className="input-wrapper">
                    <textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={e => { setMessageInput(e.target.value); handleTyping(); }}
                        onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Type a message..."
                        className="message-textarea"
                        disabled={sending}
                    />
                    <div className="input-buttons">
                        <button className="input-btn" onClick={() => setShowEmoji(v => !v)} disabled={sending}><Smile size={16} /></button>
                        <button className="input-btn" disabled><Paperclip size={16} /></button>
                        <button className="input-btn" disabled><Image size={16} /></button>
                    </div>
                    {showEmoji && (
                        <div className="emoji-picker-wrapper" ref={emojiRef}>
                            <EmojiPicker onEmojiClick={e => { setMessageInput(p => p + e.emoji); textareaRef.current?.focus(); }} height={320} width={280} />
                        </div>
                    )}
                </div>
                <button onClick={() => handleSend()} className="send-button" disabled={sending || !messageInput.trim()}>
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}

export default ChatArea;