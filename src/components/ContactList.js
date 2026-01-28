import React from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import './ContactList.css';

function ContactList({
    contacts,
    selectedChat,
    setSelectedChat,
    onShowFindFriends,
    onShowFriendRequests,
    pendingRequestsCount = 0
}) {
    return (
        <div className="contact-list">
            <div className="contact-list-header">
                <h2 className="contact-title">Bạn bè</h2>

                <div className="header-actions">
                    {/* Button: Lời mời kết bạn */}
                    <button
                        className="header-action-btn"
                        onClick={onShowFriendRequests}
                        title="Lời mời kết bạn"
                    >
                        <Users size={20} />
                        {pendingRequestsCount > 0 && (
                            <span className="notification-badge">
                                {pendingRequestsCount}
                            </span>
                        )}
                    </button>

                    {/* Button: Tìm bạn bè */}
                    <button
                        className="header-action-btn"
                        onClick={onShowFindFriends}
                        title="Tìm bạn bè"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            <div className="search-container">
                <Search size={16} className="search-icon" />
                <input
                    type="text"
                    placeholder="Tìm kiếm bạn bè..."
                    className="search-input"
                    disabled
                />
            </div>

            <div className="contacts-scroll">
                {contacts.length === 0 ? (
                    <div className="empty-contacts">
                        <Users size={48} color="#d1d5db" />
                        <p>Chưa có bạn bè nào</p>
                        <button
                            className="find-friends-cta"
                            onClick={onShowFindFriends}
                        >
                            <UserPlus size={18} />
                            Tìm bạn bè
                        </button>
                    </div>
                ) : (
                    contacts.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => setSelectedChat(contact)}
                            className={`contact-item ${selectedChat?.id === contact.id ? 'selected' : ''}`}
                        >
                            <div className="contact-avatar">{contact.avatar || '👤'}</div>
                            <div className="contact-details">
                                <div className="contact-top">
                                    <h3 className="contact-name">{contact.name}</h3>
                                    <span className="contact-time">
                                        {contact.lastSeen ? new Date(contact.lastSeen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <p className={`contact-preview ${contact.typing ? 'typing' : ''}`}>
                                    {contact.typing ? 'Đang nhập...' : (
                                        contact.preview || (contact.status === 'online' ? '● Online' : 'Offline')
                                    )}
                                </p>
                            </div>
                            {contact.unread && <div className="unread-dot"></div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ContactList;