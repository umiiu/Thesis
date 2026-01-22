import React from 'react';
import { Search } from 'lucide-react';
import './ContactList.css';

function ContactList({ contacts, selectedChat, setSelectedChat }) {
    return (
        <div className="contact-list">
            <div className="contact-list-header">
                <h2 className="contact-title">Messages</h2>
                <div className="search-container">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search contacts"
                        className="search-input"
                        disabled
                    />
                </div>
            </div>

            <div className="tabs">
                <button className="tab active">Active</button>
                <button className="tab">Inactive</button>
            </div>

            <div className="contacts-scroll">
                {contacts.map((contact) => (
                    <div
                        key={contact.id}
                        onClick={() => setSelectedChat(contact)}
                        className={`contact-item ${selectedChat?.id === contact.id ? 'selected' : ''}`}
                    >
                        <div className="contact-avatar">{contact.avatar || '👤'}</div>
                        <div className="contact-details">
                            <div className="contact-top">
                                <h3 className="contact-name">{contact.name}</h3>
                                <span className="contact-time">{contact.lastSeen ? new Date(contact.lastSeen).toLocaleString() : ''}</span>
                            </div>
                            <p className={`contact-preview ${contact.typing ? 'typing' : ''}`}>
                                {contact.preview || (contact.status === 'online' ? 'Online' : '')}
                            </p>
                        </div>
                        {contact.unread && <div className="unread-dot"></div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ContactList;