import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Loader } from 'lucide-react';
import { friendAPI } from '../services/api';
import './FindFriends.css';

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
            {isImage ? (
                <img src={avatar} alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : isEmoji ? avatar : '👤'}
        </div>
    );
};

function FindFriends({ onUpdate }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        searchTimeoutRef.current = setTimeout(() => {
            handleAutoSearch(searchQuery);
        }, 500);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery]);

    const handleAutoSearch = async (query) => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const response = await friendAPI.searchUsers(query);
            setSearchResults(response.users || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const response = await friendAPI.searchUsers(searchQuery);
            setSearchResults(response.users || []);
        } catch (error) {
            console.error('Search error:', error);
            alert('Lỗi tìm kiếm: ' + (error.error || 'Không thể tìm kiếm'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (userId) => {
        setProcessing(userId);
        try {
            await friendAPI.sendRequest(userId);
            setSearchResults(prev => prev.filter(u => u.id !== userId));
            alert('✅ Đã gửi lời mời kết bạn!');
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('Lỗi: ' + (error.error || 'Không thể gửi lời mời'));
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="find-friends-container">
            <div className="find-friends-header">
                <h2>Tìm bạn bè</h2>
                <p>Gõ tên hoặc email để tìm kiếm</p>
            </div>

            <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-wrapper">
                        <Search size={20} className="search-input-icon" />
                        <input
                            type="text"
                            placeholder="Gõ tên hoặc email... (tự động tìm kiếm)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-field"
                            autoFocus
                        />
                        {loading && <Loader size={20} className="search-loading-icon spinner" />}
                    </div>
                    <button type="submit" className="search-btn" disabled={loading || !searchQuery.trim()}>
                        {loading ? <Loader size={20} className="spinner" /> : 'Tìm kiếm'}
                    </button>
                </form>
            </div>

            <div className="search-results">
                {loading && searchResults.length === 0 ? (
                    <div className="loading-state">
                        <Loader size={32} className="spinner" />
                        <p>Đang tìm kiếm...</p>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="empty-state">
                        <Search size={48} color="#d1d5db" />
                        <p>{searchQuery ? '😔 Không tìm thấy kết quả nào' : '🔍 Gõ tên hoặc email để bắt đầu tìm kiếm'}</p>
                        {searchQuery && (
                            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>
                                Đang tìm: "<strong>{searchQuery}</strong>"
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="results-list">
                        <p className="results-count">
                            Tìm thấy {searchResults.length} kết quả cho "<strong>{searchQuery}</strong>"
                        </p>
                        {searchResults.map(user => (
                            <div key={user.id} className="user-result-item">
                                {/* ✅ SafeAvatar thay vì render trực tiếp */}
                                <SafeAvatar avatar={user.avatar} size={44} />
                                <div className="user-result-info">
                                    <h3>{user.name}</h3>
                                    <p>{user.email}</p>
                                    {user.status === 'online' && (
                                        <span className="online-badge">● Online</span>
                                    )}
                                </div>
                                <button
                                    className="add-friend-btn"
                                    onClick={() => handleAddFriend(user.id)}
                                    disabled={processing === user.id}
                                >
                                    <UserPlus size={18} />
                                    {processing === user.id ? 'Đang gửi...' : 'Thêm bạn bè'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FindFriends;