import React from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import './ContactList.css';

const SafeAvatar = ({ avatar, size = 40 }) => {
    const isImage = avatar && avatar.startsWith('data:image/');
    const isEmoji = avatar && avatar.length <= 10;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: '#e5e7eb', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.5, overflow: 'hidden', flexShrink: 0,
            position: 'relative'
        }}>
            {isImage
                ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : isEmoji ? avatar : '👤'}
        </div>
    );
};

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
                    <button className="header-action-btn" onClick={onShowFriendRequests} title="Lời mời kết bạn">
                        <Users size={20} />
                        {pendingRequestsCount > 0 && (
                            <span className="notification-badge">{pendingRequestsCount}</span>
                        )}
                    </button>
                    <button className="header-action-btn" onClick={onShowFindFriends} title="Tìm bạn bè">
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            <div className="search-container">
                <Search size={16} className="search-icon" />
                <input type="text" placeholder="Tìm kiếm bạn bè..." className="search-input" disabled />
            </div>

            <div className="contacts-scroll">
                {contacts.length === 0 ? (
                    <div className="empty-contacts">
                        <Users size={48} color="#d1d5db" />
                        <p>Chưa có bạn bè nào</p>
                        <button className="find-friends-cta" onClick={onShowFindFriends}>
                            <UserPlus size={18} /> Tìm bạn bè
                        </button>
                    </div>
                ) : (
                    contacts.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => setSelectedChat(contact)}
                            className={`contact-item ${selectedChat?.id === contact.id ? 'selected' : ''} ${contact.unread ? 'unread' : ''}`}
                        >
                            {/* Avatar with online indicator */}
                            <div className="avatar-wrapper">
                                <SafeAvatar avatar={contact.avatar} size={44} />
                                {contact.status === 'online' && (
                                    <span className="online-indicator" />
                                )}
                            </div>

                            <div className="contact-details">
                                <div className="contact-top">
                                    <h3 className={`contact-name ${contact.unread ? 'unread-name' : ''}`}>
                                        {contact.name}
                                    </h3>
                                    <span className={`contact-time ${contact.unread ? 'unread-time' : ''}`}>
                                        {contact.lastSeen
                                            ? new Date(contact.lastSeen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                            : ''}
                                    </span>
                                </div>
                                <p className={`contact-preview ${contact.typing ? 'typing' : ''} ${contact.unread ? 'unread-preview' : ''}`}>
                                    {contact.typing ? 'Đang nhập...'
                                        : contact.preview || (contact.status === 'online' ? 'Online' : 'Offline')}
                                </p>
                            </div>

                            {/* Unread dot */}
                            {contact.unread && <div className="unread-dot" />}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ContactList;