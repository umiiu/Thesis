import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Loader } from 'lucide-react';
import { friendAPI } from '../services/api';
import './FindFriends.css';

function FindFriends({ onUpdate }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(null);

    // ✅ Thêm debounce để tránh gọi API liên tục
    const searchTimeoutRef = useRef(null);

    // ✅ Auto search khi gõ (debounce 500ms)
    useEffect(() => {
        // Clear timeout cũ
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Nếu input trống, xóa kết quả
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        // Set timeout mới để search sau 500ms
        searchTimeoutRef.current = setTimeout(() => {
            handleAutoSearch(searchQuery);
        }, 500);

        // Cleanup
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    // ✅ Hàm search tự động
    const handleAutoSearch = async (query) => {
        if (!query.trim()) return;

        setLoading(true);
        try {
            const response = await friendAPI.searchUsers(query);
            setSearchResults(response.users || []);
        } catch (error) {
            console.error('Search error:', error);
            // Không hiển thị alert để UX mượt hơn
        } finally {
            setLoading(false);
        }
    };

    // ✅ Handle manual search (khi nhấn nút hoặc Enter)
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
            // Xóa khỏi kết quả tìm kiếm
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
                        {loading && (
                            <Loader size={20} className="search-loading-icon spinner" />
                        )}
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
                        <p>
                            {searchQuery
                                ? '😔 Không tìm thấy kết quả nào'
                                : '🔍 Gõ tên hoặc email để bắt đầu tìm kiếm'
                            }
                        </p>
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
                                <div className="user-result-avatar">
                                    {user.avatar || '👤'}
                                </div>
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