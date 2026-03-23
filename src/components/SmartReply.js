import React, { useState, useEffect } from 'react';
import { Sparkles, Loader, X } from 'lucide-react';
import './SmartReply.css';
import { aiAPI } from '../services/api';

function SmartReply({ lastReceivedMessage, conversationContext, onSelectReply, onClose }) {
    const [loading, setLoading] = useState(false);
    const [replies, setReplies] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (lastReceivedMessage) {
            generateReplies();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastReceivedMessage]);

    const generateReplies = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('🤖 Generating smart replies...');

            const result = await aiAPI.generateSmartReplies(
                lastReceivedMessage,
                conversationContext
            );

            if (result.success) {
                setReplies(result.replies || []);
                console.log('✅ Smart replies generated:', result.replies);
            } else {
                // Use fallback replies
                setReplies(result.replies || []);
                console.warn('⚠️ Using fallback replies');
            }

        } catch (err) {
            console.error('❌ Smart reply error:', err);
            setError('Failed to generate smart replies');
            // Set fallback replies
            setReplies([
                "Thanks for your message!",
                "I'll get back to you soon.",
                "Sounds good!"
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectReply = (reply) => {
        onSelectReply(reply);
        if (onClose) onClose();
    };

    if (!lastReceivedMessage) return null;

    return (
        <div className="smart-reply-container">
            <div className="smart-reply-header">
                <div className="smart-reply-title">
                    <Sparkles size={16} />
                    <span>Smart Replies</span>
                </div>
                {onClose && (
                    <button className="smart-reply-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {loading ? (
                <div className="smart-reply-loading">
                    <Loader size={20} className="spinner" />
                    <span>Generating suggestions...</span>
                </div>
            ) : error ? (
                <div className="smart-reply-error">
                    <span>⚠️ {error}</span>
                    <button onClick={generateReplies} className="retry-btn">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="smart-reply-options">
                    {replies.map((reply, index) => (
                        <button
                            key={index}
                            className="smart-reply-option"
                            onClick={() => handleSelectReply(reply)}
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            <div className="smart-reply-footer">
                <span className="privacy-note">
                    🔒 Processed locally - Your privacy is protected
                </span>
            </div>
        </div>
    );
}

export default SmartReply;