import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Sparkles } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './ChatArea.css';
import socketService from '../services/socket';
import { encryptMessage } from '../services/crypto';
import AIPanel from './AIPanel';

// Helper render avatar an toàn
const SafeAvatar = ({ avatar, size = 40 }) => {
    const isImage = avatar && avatar.startsWith('data:image/');
    const isEmoji = avatar && avatar.length <= 10;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: '#e5e7eb', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.5, overflow: 'hidden', flexShrink: 0
        }}>
            {isImage
                ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : isEmoji ? avatar : '👤'}
        </div>
    );
};

function ChatArea({ selectedChat, messages, currentUser, onlineUsers, isTyping, onSendMessage }) {
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showAI, setShowAI] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) {
                setShowEmoji(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTyping = () => {
        if (!selectedChat || !currentUser) return;
        socketService.startTyping(currentUser.id, selectedChat.id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketService.stopTyping(currentUser.id, selectedChat.id);
        }, 1000);
    };

    const handleSend = async () => {
        if (!messageInput.trim() || !selectedChat || !currentUser || sending) return;

        const originalText = messageInput.trim();
        setSending(true);
        setMessageInput('');

        try {
            socketService.stopTyping(currentUser.id, selectedChat.id);

            const encryptedForRecipient = await encryptMessage(originalText, selectedChat.publicKey);

            let encryptedForSelf = null;
            if (currentUser.publicKey) {
                try {
                    encryptedForSelf = await encryptMessage(originalText, currentUser.publicKey);
                } catch (err) {
                    console.warn('⚠️ Failed to encrypt for self:', err);
                }
            }

            const messageData = {
                senderId: currentUser.id,
                recipientId: selectedChat.id,
                encryptedContent: encryptedForRecipient.encryptedContent,
                iv: encryptedForRecipient.iv,
                encryptedKey: encryptedForRecipient.encryptedKey,
                selfEncryptedContent: encryptedForSelf?.encryptedContent,
                selfIv: encryptedForSelf?.iv,
                selfEncryptedKey: encryptedForSelf?.encryptedKey,
                timestamp: new Date().toISOString(),
                tempId: `temp_${Date.now()}`
            };

            socketService.sendMessage(messageData);
            if (onSendMessage) onSendMessage({ ...messageData, originalText });
        } catch (error) {
            console.error('❌ Error sending message:', error);
            alert('Failed to send message. Please try again.');
            setMessageInput(originalText);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSelectReply = (reply) => {
        setMessageInput(reply);
        setShowAI(false);
        textareaRef.current?.focus();
    };

    if (!selectedChat) {
        return <div className="chat-area empty">Select a chat</div>;
    }

    const isOnline = onlineUsers?.has(selectedChat.id);

    return (
        <div className="chat-area-wrapper">
            <div className="chat-area">
                {/* Header */}
                <div className="chat-header">
                    <div className="chat-user-info">
                        {/* ✅ SafeAvatar thay vì render thẳng */}
                        <SafeAvatar avatar={selectedChat.avatar} size={40} />
                        <div>
                            <h3 className="chat-username">{selectedChat.name}</h3>
                            <div className="chat-status">
                                {isOnline
                                    ? <span className="last-visit online">● Online</span>
                                    : <span className="last-visit">Offline</span>
                                }
                            </div>
                        </div>
                    </div>
                    <button
                        className={`ai-toggle-btn ${showAI ? 'active' : ''}`}
                        onClick={() => setShowAI(v => !v)}
                        title="AI Assistant"
                    >
                        <Sparkles size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className="messages-area">
                    {messages.map((message, index) => (
                        <div key={message.id || index} className={`message-row ${message.isOwn ? 'own' : 'other'}`}>
                            <div className="message-content">
                                {/* ✅ SafeAvatar cho message avatar */}
                                {!message.isOwn && <SafeAvatar avatar={selectedChat.avatar} size={32} />}
                                <div>
                                    <div className={`message-bubble ${message.isOwn ? 'own' : 'other'}`}>
                                        <p>{message.text}</p>
                                    </div>
                                    <div className={`message-info ${message.isOwn ? 'own' : 'other'}`}>
                                        <span className="msg-time">{message.time}</span>
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

                {/* Input */}
                <div className="input-area">
                    <div className="input-wrapper">
                        <textarea
                            ref={textareaRef}
                            value={messageInput}
                            onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            className="message-textarea"
                            disabled={sending}
                        />
                        <div className="input-buttons">
                            <button className="input-btn" onClick={() => setShowEmoji(v => !v)} disabled={sending}>
                                <Smile size={16} />
                            </button>

                        </div>

                        {showEmoji && (
                            <div className="emoji-picker-wrapper" ref={emojiRef}>
                                <EmojiPicker
                                    onEmojiClick={(emoji) => {
                                        setMessageInput(prev => prev + emoji.emoji);
                                        textareaRef.current?.focus();
                                    }}
                                    height={320}
                                    width={280}
                                />
                            </div>
                        )}
                    </div>

                    <button onClick={handleSend} className="send-button" disabled={sending || !messageInput.trim()}>
                        <Send size={20} />
                    </button>
                </div>
            </div>

            {/* AI Panel */}
            {showAI && (
                <AIPanel
                    messages={messages}
                    onSelectReply={handleSelectReply}
                    onClose={() => setShowAI(false)}
                />
            )}
        </div>
    );
}

export default ChatArea;