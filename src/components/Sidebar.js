import React from 'react';
import { Lock, Menu, LogOut, Settings as SettingsIcon } from 'lucide-react';
import './Sidebar.css';

// Helper render avatar an toàn
const SafeAvatar = ({ avatar, size = 40 }) => {
    const isImage = avatar && avatar.startsWith('data:image/');
    const isEmoji = avatar && avatar.length <= 10;

    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: '#d1d5db', display: 'flex',
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

function Sidebar({ user, onLogout, currentView, onViewChange }) {
    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            onLogout();
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon"><Lock size={20} /></div>
                    <span className="logo-text">SecureChat</span>
                </div>
                <button className="menu-btn"><Menu size={20} /></button>
            </div>

            <nav className="sidebar-nav">
                <button
                    className={`nav-item ${currentView === 'messages' ? 'active' : ''}`}
                    onClick={() => onViewChange?.('messages')}
                >
                    <span className="nav-icon">💬</span>
                    <span>Messages</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => onViewChange?.('settings')}
                >
                    <SettingsIcon size={16} />
                    <span>Settings</span>
                </button>
                <button
                    className="nav-item"
                    onClick={handleLogout}
                    style={{ color: '#ef4444', marginTop: '8px' }}
                >
                    <LogOut size={16} />
                    <span>Logout</span>
                </button>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile">
                    {/* ✅ SafeAvatar thay div user-avatar */}
                    <SafeAvatar avatar={user?.avatar} size={40} />
                    <div className="user-info">
                        <div className="user-name">{user?.name || 'User'}</div>
                        <div className="user-role">Online</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;