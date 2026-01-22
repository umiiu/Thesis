import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    // Connect to WebSocket server
    connect(userId) {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket.id);
            this.connected = true;

            // Notify server that user is online
            if (userId) {
                this.socket.emit('user-online', userId);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return this.socket;
    }

    // Disconnect from server
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // Check if connected
    isConnected() {
        return this.connected && this.socket?.connected;
    }

    // ==================== USER STATUS ====================

    // Set user online
    setUserOnline(userId) {
        if (this.socket) {
            this.socket.emit('user-online', userId);
        }
    }

    // Listen for user status changes
    onUserStatusChange(callback) {
        if (this.socket) {
            this.socket.on('user-status-change', callback);
        }
    }

    // ==================== MESSAGING ====================

    // Send message
    sendMessage(messageData) {
        if (this.socket) {
            this.socket.emit('send-message', messageData);
        } else {
            console.error('Socket not connected');
        }
    }

    // Listen for incoming messages
    onReceiveMessage(callback) {
        if (this.socket) {
            this.socket.on('receive-message', callback);
        }
    }

    // Listen for message sent confirmation
    onMessageSent(callback) {
        if (this.socket) {
            this.socket.on('message-sent', callback);
        }
    }

    // Listen for message status updates
    onMessageStatus(callback) {
        if (this.socket) {
            this.socket.on('message-status', callback);
        }
    }

    // Listen for message errors
    onMessageError(callback) {
        if (this.socket) {
            this.socket.on('message-error', callback);
        }
    }

    // ==================== TYPING INDICATORS ====================

    // Send typing start
    startTyping(senderId, recipientId) {
        if (this.socket) {
            this.socket.emit('typing-start', { senderId, recipientId });
        }
    }

    // Send typing stop
    stopTyping(senderId, recipientId) {
        if (this.socket) {
            this.socket.emit('typing-stop', { senderId, recipientId });
        }
    }

    // Listen for typing events
    onUserTyping(callback) {
        if (this.socket) {
            this.socket.on('user-typing', callback);
        }
    }

    // ==================== READ RECEIPTS ====================

    // Mark message as read
    markMessageAsRead(messageId, userId) {
        if (this.socket) {
            this.socket.emit('message-read', { messageId, userId });
        }
    }

    // Mark entire conversation as read
    markConversationAsRead(userId, partnerId) {
        if (this.socket) {
            this.socket.emit('mark-conversation-read', { userId, partnerId });
        }
    }

    // Listen for read receipts
    onMessageReadReceipt(callback) {
        if (this.socket) {
            this.socket.on('message-read-receipt', callback);
        }
    }

    // Listen for conversation read
    onConversationRead(callback) {
        if (this.socket) {
            this.socket.on('conversation-read', callback);
        }
    }

    // ==================== CLEANUP ====================

    // Remove all listeners
    removeAllListeners() {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    // Remove specific listener
    removeListener(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;