import React, { useState } from 'react';
import { FileText, Loader, X, ChevronDown, ChevronUp } from 'lucide-react';
import './ConversationSummary.css';
import { aiAPI } from '../services/api';

function ConversationSummary({ messages, onClose }) {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({
        topics: true,
        keyPoints: true,
        actionItems: true,
        mentions: false
    });

    const generateSummary = async () => {
        if (messages.length === 0) {
            setError('No messages to summarize');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`📝 Summarizing ${messages.length} messages...`);

            const result = await aiAPI.summarizeConversation(messages, {
                maxLength: 200,
                includeTopics: true,
                includeKeyPoints: true
            });

            if (result.success) {
                setSummary(result.summary);
                console.log('✅ Summary generated:', result.summary);
            } else {
                setError(result.error || 'Failed to generate summary');
                setSummary(result.summary); // fallback summary
            }

        } catch (err) {
            console.error('❌ Summarization error:', err);
            setError('Failed to generate summary');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div className="summary-modal-overlay" onClick={onClose}>
            <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
                <div className="summary-header">
                    <div className="summary-title">
                        <FileText size={20} />
                        <span>Conversation Summary</span>
                    </div>
                    <button className="summary-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="summary-content">
                    {!summary && !loading && (
                        <div className="summary-prompt">
                            <FileText size={48} color="#94a3b8" />
                            <h3>Generate Conversation Summary</h3>
                            <p>
                                AI will analyze {messages.length} messages and provide:
                            </p>
                            <ul>
                                <li>Main topics discussed</li>
                                <li>Key points and decisions</li>
                                <li>Action items</li>
                                <li>Important dates and times</li>
                            </ul>
                            <button
                                className="generate-btn"
                                onClick={generateSummary}
                                disabled={loading}
                            >
                                <Sparkles size={18} />
                                Generate Summary
                            </button>
                            <p className="privacy-note">
                                🔒 Your messages are processed securely. Data never leaves your device without encryption.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="summary-loading">
                            <Loader size={32} className="spinner" />
                            <p>Analyzing conversation...</p>
                            <span className="loading-subtitle">
                                Processing {messages.length} messages
                            </span>
                        </div>
                    )}

                    {error && !summary && (
                        <div className="summary-error">
                            <span>⚠️ {error}</span>
                            <button onClick={generateSummary} className="retry-btn">
                                Try Again
                            </button>
                        </div>
                    )}

                    {summary && (
                        <div className="summary-results">
                            {/* Overall Summary */}
                            <div className="summary-section">
                                <h4>📄 Summary</h4>
                                <p className="summary-text">{summary.summary}</p>
                            </div>

                            {/* Topics */}
                            {summary.topics && summary.topics.length > 0 && (
                                <div className="summary-section">
                                    <div
                                        className="section-header"
                                        onClick={() => toggleSection('topics')}
                                    >
                                        <h4>💬 Main Topics ({summary.topics.length})</h4>
                                        {expanded.topics ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                    {expanded.topics && (
                                        <ul className="summary-list">
                                            {summary.topics.map((topic, index) => (
                                                <li key={index}>{topic}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Key Points */}
                            {summary.keyPoints && summary.keyPoints.length > 0 && (
                                <div className="summary-section">
                                    <div
                                        className="section-header"
                                        onClick={() => toggleSection('keyPoints')}
                                    >
                                        <h4>🔑 Key Points ({summary.keyPoints.length})</h4>
                                        {expanded.keyPoints ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                    {expanded.keyPoints && (
                                        <ul className="summary-list">
                                            {summary.keyPoints.map((point, index) => (
                                                <li key={index}>{point}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Action Items */}
                            {summary.actionItems && summary.actionItems.length > 0 && (
                                <div className="summary-section highlight">
                                    <div
                                        className="section-header"
                                        onClick={() => toggleSection('actionItems')}
                                    >
                                        <h4>✅ Action Items ({summary.actionItems.length})</h4>
                                        {expanded.actionItems ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                    {expanded.actionItems && (
                                        <ul className="summary-list">
                                            {summary.actionItems.map((item, index) => (
                                                <li key={index}>{item}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Mentions (Dates/Times) */}
                            {summary.mentions && (summary.mentions.dates?.length > 0 || summary.mentions.times?.length > 0) && (
                                <div className="summary-section">
                                    <div
                                        className="section-header"
                                        onClick={() => toggleSection('mentions')}
                                    >
                                        <h4>📅 Important Dates & Times</h4>
                                        {expanded.mentions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                    {expanded.mentions && (
                                        <div className="mentions-grid">
                                            {summary.mentions.dates?.length > 0 && (
                                                <div>
                                                    <strong>Dates:</strong>
                                                    <ul className="summary-list">
                                                        {summary.mentions.dates.map((date, index) => (
                                                            <li key={index}>{date}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {summary.mentions.times?.length > 0 && (
                                                <div>
                                                    <strong>Times:</strong>
                                                    <ul className="summary-list">
                                                        {summary.mentions.times.map((time, index) => (
                                                            <li key={index}>{time}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Regenerate Button */}
                            <button
                                className="regenerate-btn"
                                onClick={generateSummary}
                                disabled={loading}
                            >
                                🔄 Regenerate Summary
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Missing import for Sparkles icon
function Sparkles({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364l-2.121-2.121M6.757 6.757L4.636 4.636m12.728 0l-2.121 2.121M6.757 17.243l-2.121 2.121" />
        </svg>
    );
}

export default ConversationSummary;