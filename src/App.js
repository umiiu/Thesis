import React, { useState, useEffect } from 'react';
import './App.css';

import Login from './components/Login';
import SignUp from './components/SignUp';
import Sidebar from './components/Sidebar';
import ContactList from './components/ContactList';
import ChatArea from './components/ChatArea';
import Settings from './components/Settings';
import FriendRequests from './components/FriendRequests';
import FindFriends from './components/FindFriends';

import socketService from './services/socket';
import { friendAPI, messageAPI, authAPI } from './services/api';
import { decryptMessage, clearPrivateKey } from './services/crypto';
import { getPrivateKey } from './services/keyManagement';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('messages');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    checkExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkExistingSession = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const privateKey = getPrivateKey();

    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);

        if (!privateKey) {
          alert('⚠️ Your encryption key is not available.\n\nPlease login again to restore your encryption key and decrypt messages.');
        }

        await initializeApp(userData);
      } catch (error) {
        console.error('❌ Error restoring session:', error);
        handleLogout();
      }
    }

    setLoading(false);
  };

  const initializeApp = async (userData) => {
    try {
      socketService.connect(userData.id);
      socketService.setUserOnline(userData.id);
      await loadFriends();
      await loadPendingRequestsCount();
      setupSocketListeners(userData.id);
    } catch (error) {
      console.error('❌ Error initializing app:', error);
    }
  };

  // ✅ Load friends + check unread từng người
  const loadFriends = async () => {
    try {
      console.log('📥 Loading friends list...');
      const response = await friendAPI.getFriends();

      if (response.success) {
        const list = await Promise.all(
          response.friends.map(async (f) => {
            let hasUnread = false;
            try {
              const unreadRes = await messageAPI.getUnreadFromSender(f.id);
              hasUnread = (unreadRes.unreadCount || 0) > 0;
            } catch (e) {
              // không block nếu lỗi
            }

            return {
              id: f.id,
              name: f.name,
              email: f.email,
              avatar: f.avatar || '👤',
              status: f.status || 'offline',
              lastSeen: f.lastSeen,
              publicKey: f.publicKey,
              preview: '',
              time: '',
              unread: hasUnread,
              typing: false
            };
          })
        );

        setContacts(list);
        console.log('✅ Loaded', list.length, 'friends');
      }
    } catch (error) {
      console.error('❌ Error loading friends:', error);
    }
  };

  const loadPendingRequestsCount = async () => {
    try {
      const response = await friendAPI.getPendingCount();
      setPendingRequestsCount(response.count || 0);
    } catch (error) {
      console.error('❌ Error loading pending count:', error);
    }
  };

  const setupSocketListeners = () => {
    socketService.onUserStatusChange((data) => {
      setOnlineUsers(prev => {
        const s = new Set(prev);
        data.status === 'online' ? s.add(data.userId) : s.delete(data.userId);
        return s;
      });

      setContacts(prev =>
        prev.map(c =>
          c.id === data.userId
            ? { ...c, status: data.status, lastSeen: data.lastSeen || data.timestamp }
            : c
        )
      );
    });

    socketService.onReceiveMessage(async (data) => {
      try {
        const privateKey = getPrivateKey();
        let text = '[Encrypted message - Private key not available]';

        if (privateKey) {
          text = await decryptMessage(
            data.encryptedContent,
            data.encryptedKey,
            data.iv,
            privateKey
          );
        }

        const msg = {
          id: data.id,
          sender: data.senderId,
          senderName: data.senderName,
          text,
          time: new Date(data.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          isOwn: false,
          timestamp: data.timestamp
        };

        setMessages(prev => ({
          ...prev,
          [data.senderId]: [...(prev[data.senderId] || []), msg]
        }));

        // ✅ Chỉ set unread nếu không đang chat với người đó
        setSelectedChat(currentChat => {
          updateContactPreview(
            data.senderId,
            text,
            new Date(data.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            currentChat?.id !== data.senderId // unread = true nếu không đang mở chat đó
          );
          return currentChat;
        });

      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    });

    socketService.onMessageSent((data) => {
      setSelectedChat(currentChat => {
        if (!currentChat) return currentChat;
        setMessages(prev => ({
          ...prev,
          [currentChat.id]: (prev[currentChat.id] || []).map(msg =>
            msg.id === data.tempId
              ? { ...msg, id: data.messageId, pending: false }
              : msg
          )
        }));
        return currentChat;
      });
    });

    socketService.onUserTyping((data) => {
      setTypingUsers(prev => {
        const s = new Set(prev);
        data.isTyping ? s.add(data.userId) : s.delete(data.userId);
        return s;
      });

      setContacts(prev =>
        prev.map(c =>
          c.id === data.userId ? { ...c, typing: data.isTyping } : c
        )
      );
    });

    socketService.onMessageError((data) => {
      alert('Failed to send message: ' + data.error);
    });
  };

  const updateContactPreview = (id, text, time, unread) => {
    setContacts(prev =>
      prev.map(c =>
        c.id === id
          ? {
            ...c,
            preview: text.slice(0, 50),
            time,
            unread: unread
          }
          : c
      )
    );
  };

  const handleLogin = async (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsLoggedIn(true);
    await initializeApp(userData);
  };

  const handleSignUp = handleLogin;

  const handleLogout = async () => {
    try {
      if (user) await authAPI.logout(user.id);
      socketService.disconnect();
    } finally {
      clearPrivateKey();
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSelectChat = async (contact) => {
    console.log('💬 Opening chat with:', contact.name);
    setSelectedChat(contact);
    setCurrentView('messages');

    // ✅ Mark as read ngay khi mở chat
    setContacts(prev =>
      prev.map(c => (c.id === contact.id ? { ...c, unread: false } : c))
    );

    // ✅ Báo server mark conversation as read
    if (user?.id) {
      socketService.markConversationAsRead(user.id, contact.id);
    }

    if (!user || !user.id) return;

    try {
      console.log('📥 Loading conversation history...');
      const response = await messageAPI.getConversation(user.id, contact.id);

      if (response.success && response.messages.length > 0) {
        const privateKey = getPrivateKey();

        if (!privateKey) {
          const encryptedMsgs = response.messages.map(msg => ({
            id: msg._id,
            sender: msg.sender._id,
            senderName: msg.sender.name,
            text: '[Encrypted message - Private key not available]',
            time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit'
            }),
            isOwn: msg.sender._id === user.id,
            timestamp: msg.timestamp
          }));
          setMessages(prev => ({ ...prev, [contact.id]: encryptedMsgs }));
          return;
        }

        const decryptedMsgs = await Promise.all(
          response.messages.map(async (msg) => {
            try {
              let decryptedText;
              const isOwnMessage = msg.sender._id === user.id;

              if (isOwnMessage) {
                if (msg.selfEncryptedContent && msg.selfIv && msg.selfEncryptedKey) {
                  decryptedText = await decryptMessage(
                    msg.selfEncryptedContent,
                    msg.selfEncryptedKey,
                    msg.selfIv,
                    privateKey
                  );
                } else {
                  return {
                    id: msg._id,
                    sender: msg.sender._id,
                    senderName: msg.sender.name,
                    text: '[Sent before self-encryption feature]',
                    time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit'
                    }),
                    isOwn: true,
                    timestamp: msg.timestamp
                  };
                }
              } else {
                decryptedText = await decryptMessage(
                  msg.encryptedContent,
                  msg.encryptedKey,
                  msg.iv,
                  privateKey
                );
              }

              return {
                id: msg._id,
                sender: msg.sender._id,
                senderName: msg.sender.name,
                text: decryptedText,
                time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit'
                }),
                isOwn: isOwnMessage,
                timestamp: msg.timestamp
              };

            } catch (error) {
              console.error('❌ Error decrypting message:', error);
              return {
                id: msg._id,
                sender: msg.sender._id,
                senderName: msg.sender.name,
                text: '[Failed to decrypt]',
                time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit'
                }),
                isOwn: msg.sender._id === user.id,
                timestamp: msg.timestamp
              };
            }
          })
        );

        setMessages(prev => ({ ...prev, [contact.id]: decryptedMsgs }));
        console.log('✅ Loaded', decryptedMsgs.length, 'messages');

      } else {
        setMessages(prev => ({ ...prev, [contact.id]: [] }));
      }

    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  };

  const handleSendMessage = (data) => {
    const msg = {
      id: data.tempId,
      sender: user.id,
      senderName: user.name,
      text: data.originalText,
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      }),
      isOwn: true,
      pending: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), msg]
    }));

    updateContactPreview(
      selectedChat.id,
      data.originalText,
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      false
    );
  };

  const handleShowFindFriends = () => {
    setCurrentView('find');
    setSelectedChat(null);
  };

  const handleShowFriendRequests = () => {
    setCurrentView('requests');
    setSelectedChat(null);
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
    setSelectedChat(null);
  };

  const handleShowMessages = () => {
    setCurrentView('messages');
  };

  const handleFriendsUpdate = async () => {
    await loadFriends();
    await loadPendingRequestsCount();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '16px',
        background: 'linear-gradient(135deg, #E8ECFF 0%, #C7D7FF 100%)'
      }}>
        <div style={{ fontSize: '48px' }}>🔒</div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>SecureChat</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn && showSignUp)
    return <SignUp onSignUp={handleSignUp} onSwitchToLogin={() => setShowSignUp(false)} />;

  if (!isLoggedIn)
    return <Login onLogin={handleLogin} onSwitchToSignUp={() => setShowSignUp(true)} />;

  return (
    <div className="app-container">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'settings') handleShowSettings();
          if (view === 'messages') handleShowMessages();
        }}
      />

      <ContactList
        contacts={contacts}
        selectedChat={selectedChat}
        setSelectedChat={handleSelectChat}
        onlineUsers={onlineUsers}
        onShowFindFriends={handleShowFindFriends}
        onShowFriendRequests={handleShowFriendRequests}
        pendingRequestsCount={pendingRequestsCount}
      />

      {currentView === 'messages' && selectedChat ? (
        <ChatArea
          selectedChat={selectedChat}
          messages={messages[selectedChat.id] || []}
          currentUser={user}
          onlineUsers={onlineUsers}
          isTyping={typingUsers.has(selectedChat.id)}
          onSendMessage={handleSendMessage}
        />
      ) : currentView === 'settings' ? (
        <Settings user={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} />
      ) : currentView === 'requests' ? (
        <FriendRequests onUpdate={handleFriendsUpdate} />
      ) : currentView === 'find' ? (
        <FindFriends onUpdate={handleFriendsUpdate} />
      ) : (
        <div className="empty-state-main">
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
          <h2>Chọn một cuộc trò chuyện</h2>
          <p>Chọn bạn bè từ danh sách bên trái để bắt đầu nhắn tin</p>
        </div>
      )}
    </div>
  );
}

export default App;