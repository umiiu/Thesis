import React, { useState } from 'react';
import { Sparkles, MessageSquare, FileText, X, Loader, AlertCircle } from 'lucide-react';
import './AIPanel.css';
import { generateSmartReplies, summarizeConversation } from '../services/ai';

function AIPanel({ messages, onSelectReply, onClose }) {
    const [smartReplies, setSmartReplies] = useState([]);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('replies');

    const decryptedMessages = messages.filter(m => m.text && !m.text.startsWith('['));

    const handleSmartReplies = async () => {
        if (decryptedMessages.length === 0) {
            setError('No messages to analyze.');
            return;
        }
        setLoading(true);
        setError('');
        setSmartReplies([]);
        try {
            const replies = await generateSmartReplies(decryptedMessages);
            setSmartReplies(replies);
        } catch (err) {
            setError('Failed to generate suggestions. Please try again.');
            console.error('Smart reply error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSummarize = async () => {
        if (decryptedMessages.length === 0) {
            setError('No messages to summarize.');
            return;
        }
        setLoading(true);
        setError('');
        setSummary('');
        try {
            const result = await summarizeConversation(decryptedMessages);
            setSummary(result);
        } catch (err) {
            setError('Failed to generate summary. Please try again.');
            console.error('Summarize error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-panel">
            <div className="ai-panel-header">
                <div className="ai-panel-title">
                    <Sparkles size={16} />
                    <span>AI Assistant</span>
                    <span className="ai-badge">Gemini</span>
                </div>
                <button className="ai-close-btn" onClick={onClose}>
                    <X size={16} />
                </button>
            </div>

            <div className="ai-panel-tabs">
                <button
                    className={`ai-tab ${activeTab === 'replies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('replies')}
                >
                    <MessageSquare size={14} /> Smart Reply
                </button>
                <button
                    className={`ai-tab ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    <FileText size={14} /> Summary
                </button>
            </div>

            <div className="ai-panel-body">
                {error && (
                    <div className="ai-error">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}

                {activeTab === 'replies' && (
                    <div className="ai-section">
                        <p className="ai-hint">Generate reply suggestions based on conversation context.</p>
                        <button
                            className="ai-action-btn"
                            onClick={handleSmartReplies}
                            disabled={loading}
                        >
                            {loading ? <Loader size={14} className="spin" /> : <MessageSquare size={14} />}
                            {loading ? 'Generating...' : 'Get Suggestions'}
                        </button>

                        {smartReplies.length > 0 && (
                            <div className="ai-replies">
                                {smartReplies.map((reply, i) => (
                                    <button
                                        key={i}
                                        className="ai-reply-chip"
                                        onClick={() => onSelectReply(reply)}
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'summary' && (
                    <div className="ai-section">
                        <p className="ai-hint">Summarize the current conversation.</p>
                        <button
                            className="ai-action-btn"
                            onClick={handleSummarize}
                            disabled={loading}
                        >
                            {loading ? <Loader size={14} className="spin" /> : <FileText size={14} />}
                            {loading ? 'Summarizing...' : 'Summarize'}
                        </button>

                        {summary && (
                            <div className="ai-summary-box">
                                <p>{summary}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="ai-panel-footer">
                <span>🔒 Processed locally — messages never leave your device</span>
            </div>
        </div>
    );
}

export default AIPanel;