import React, { useState, useEffect, useRef } from 'react';
import { Send, MoreVertical, Paperclip, Smile, Image } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './ChatArea.css';
import socketService from '../services/socket';
import { encryptMessage } from '../services/crypto';

function ChatArea({ selectedChat, messages, currentUser, onlineUsers, isTyping, onSendMessage }) {
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // đóng emoji khi click ra ngoài
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

    // Send encrypted message
    const handleSend = async () => {
        if (!messageInput.trim() || !selectedChat || !currentUser || sending) {
            return;
        }

        const originalText = messageInput.trim();
        setSending(true);
        setMessageInput('');

        try {
            // Stop typing indicator
            socketService.stopTyping(currentUser.id, selectedChat.id);

            console.log('🔐 Encrypting message...');

            // STEP 1: Encrypt for RECIPIENT (so they can read it)
            const encryptedForRecipient = await encryptMessage(originalText, selectedChat.publicKey);
            console.log('✅ Encrypted for recipient');

            // STEP 2: Encrypt for YOURSELF (so you can read it later)
            const currentUserPublicKey = currentUser.publicKey;
            let encryptedForSelf = null;

            if (currentUserPublicKey) {
                try {
                    encryptedForSelf = await encryptMessage(originalText, currentUserPublicKey);
                    console.log('✅ Encrypted for self (for later decryption)');
                } catch (error) {
                    console.warn('⚠️ Failed to encrypt message for self:', error);
                    // Continue anyway, recipient can still read it
                }
            } else {
                console.warn('⚠️ Current user public key not available');
            }

            const messageData = {
                senderId: currentUser.id,
                recipientId: selectedChat.id,
                // For recipient
                encryptedContent: encryptedForRecipient.encryptedContent,
                iv: encryptedForRecipient.iv,
                encryptedKey: encryptedForRecipient.encryptedKey,
                // For sender (to read later)
                selfEncryptedContent: encryptedForSelf?.encryptedContent,
                selfIv: encryptedForSelf?.iv,
                selfEncryptedKey: encryptedForSelf?.encryptedKey,
                timestamp: new Date().toISOString(),
                tempId: `temp_${Date.now()}`
            };

            // Send via WebSocket
            socketService.sendMessage(messageData);

            // Notify parent for optimistic UI update
            if (onSendMessage) {
                onSendMessage({ ...messageData, originalText });
            }

            console.log('✅ Message sent successfully (encrypted 2 ways)');

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

    if (!selectedChat) {
        return <div className="chat-area empty">Select a chat</div>;
    }

    const isOnline = onlineUsers?.has(selectedChat.id);

    return (
        <div className="chat-area">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className="chat-avatar">{selectedChat.avatar}</div>
                    <div>
                        <h3 className="chat-username">{selectedChat.name}</h3>
                        <div className="chat-status">
                            {isOnline ? (
                                <span className="last-visit online">● Online</span>
                            ) : (
                                <span className="last-visit">Offline</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
                {messages.map((message, index) => (
                    <div key={message.id || index} className={`message-row ${message.isOwn ? 'own' : 'other'}`}>
                        <div className="message-content">
                            {!message.isOwn && <div className="msg-avatar">{selectedChat.avatar}</div>}
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
                        onChange={(e) => {
                            setMessageInput(e.target.value);
                            handleTyping();
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="message-textarea"
                        disabled={sending}
                    />

                    <div className="input-buttons">
                        <button
                            className="input-btn"
                            onClick={() => setShowEmoji(v => !v)}
                            disabled={sending}
                        >
                            <Smile size={16} />
                        </button>
                        <button className="input-btn" disabled>
                            <Paperclip size={16} />
                        </button>
                        <button className="input-btn" disabled>
                            <Image size={16} />
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

                <button
                    onClick={handleSend}
                    className="send-button"
                    disabled={sending || !messageInput.trim()}
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}

export default ChatArea;
