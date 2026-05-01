import React, { useState, useEffect } from 'react';
import { Check, X, Loader } from 'lucide-react';
import { friendAPI } from '../services/api';
import './FriendRequests.css';

function FriendRequests({ onUpdate }) {
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('received'); // 'received' hoặc 'sent'
    const [processing, setProcessing] = useState(null); // userId đang xử lý

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const [received, sent] = await Promise.all([
                friendAPI.getReceivedRequests(),
                friendAPI.getSentRequests()
            ]);

            setReceivedRequests(received.requests || []);
            setSentRequests(sent.requests || []);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (userId) => {
        console.log('🔍 Accepting request from userId:', userId); // ✅ THÊM DÒNG NÀY
        console.log('🔍 Type:', typeof userId); // ✅ THÊM DÒNG NÀY
        setProcessing(userId);
        try {
            await friendAPI.acceptRequest(userId);
            // Xóa khỏi danh sách
            setReceivedRequests(prev => prev.filter(r => r.id !== userId));
            // Thông báo cho component cha để reload friends
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('Lỗi: ' + (error.error || 'Không thể chấp nhận lời mời'));
        } finally {
            setProcessing(null);
        }
    };

    const handleDecline = async (userId) => {
        setProcessing(userId);
        try {
            await friendAPI.declineRequest(userId);
            setReceivedRequests(prev => prev.filter(r => r.id !== userId));
        } catch (error) {
            alert('Lỗi: ' + (error.error || 'Không thể từ chối lời mời'));
        } finally {
            setProcessing(null);
        }
    };

    const handleCancel = async (userId) => {
        setProcessing(userId);
        try {
            await friendAPI.cancelRequest(userId);
            setSentRequests(prev => prev.filter(r => r.id !== userId));
        } catch (error) {
            alert('Lỗi: ' + (error.error || 'Không thể hủy lời mời'));
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <div className="friend-requests-loading">
                <Loader size={32} className="spinner" />
                <p>Đang tải...</p>
            </div>
        );
    }

    const currentList = activeTab === 'received' ? receivedRequests : sentRequests;

    return (
        <div className="friend-requests-container">
            <div className="friend-requests-header">
                <h2>Lời mời kết bạn</h2>
            </div>

            <div className="request-tabs">
                <button
                    className={`request-tab ${activeTab === 'received' ? 'active' : ''}`}
                    onClick={() => setActiveTab('received')}
                >
                    Đã nhận ({receivedRequests.length})
                </button>
                <button
                    className={`request-tab ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                >
                    Đã gửi ({sentRequests.length})
                </button>
            </div>

            <div className="requests-list">
                {currentList.length === 0 ? (
                    <div className="no-requests">
                        <p>
                            {activeTab === 'received'
                                ? '📭 Không có lời mời kết bạn nào'
                                : '📤 Chưa gửi lời mời nào'
                            }
                        </p>
                    </div>
                ) : (
                    currentList.map(user => (
                        <div key={user.id} className="request-item">
                            <div className="request-avatar">
                                {user.avatar || '👤'}
                            </div>
                            <div className="request-info">
                                <h3>{user.name}</h3>
                                <p>{user.email}</p>
                                <span className="request-time">
                                    {new Date(user.requestedAt).toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                            <div className="request-actions">
                                {activeTab === 'received' ? (
                                    <>
                                        <button
                                            className="btn-accept"
                                            onClick={() => handleAccept(user.id)}
                                            disabled={processing === user.id}
                                        >
                                            <Check size={18} />
                                            Chấp nhận
                                        </button>
                                        <button
                                            className="btn-decline"
                                            onClick={() => handleDecline(user.id)}
                                            disabled={processing === user.id}
                                        >
                                            <X size={18} />
                                            Từ chối
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="btn-cancel"
                                        onClick={() => handleCancel(user.id)}
                                        disabled={processing === user.id}
                                    >
                                        Hủy lời mời
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}


export default FriendRequests;