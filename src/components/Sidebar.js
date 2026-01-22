import React from 'react';
import { Lock, Menu, LogOut, Settings as SettingsIcon } from 'lucide-react';
import './Sidebar.css';

function Sidebar({ user, onLogout, currentView, onViewChange }) {
    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            onLogout();
        }
    };

    return (
        <div className="sidebar">
            {/* ===== Header ===== */}
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">
                        <Lock size={20} />
                    </div>
                    <span className="logo-text">SecureChat</span>
                </div>

                <button className="menu-btn">
                    <Menu size={20} />
                </button>
            </div>

            {/* ===== Navigation ===== */}
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

            {/* ===== Footer ===== */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">
                        {user?.avatar || '👤'}
                    </div>

                    <div className="user-info">
                        <div className="user-name">
                            {user?.name || 'User'}
                        </div>
                        <div className="user-role">Online</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
