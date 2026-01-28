import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// ==================== AUTH API ====================

export const authAPI = {
    // Register new user
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Registration failed' };
        }
    },

    // Login user
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Login failed. Please check your credentials.';
            throw new Error(message);
        }
    },

    // Logout user
    logout: async (userId) => {
        try {
            const response = await api.post('/auth/logout', { userId });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Logout failed' };
        }
    },

    // Verify token
    verifyToken: async () => {
        try {
            const response = await api.get('/auth/verify');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Token verification failed' };
        }
    },
};

// ==================== USER API ====================

export const userAPI = {
    // Get all users
    getAllUsers: async () => {
        try {
            const response = await api.get('/users');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch users' };
        }
    },

    // Get user by ID
    getUserById: async (userId) => {
        try {
            const response = await api.get(`/users/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch user' };
        }
    },

    // Search users
    searchUsers: async (query) => {
        try {
            const response = await api.get(`/users/search/${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to search users' };
        }
    },

    // Update user status
    updateStatus: async (userId, status) => {
        try {
            const response = await api.put(`/users/${userId}/status`, { status });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to update status' };
        }
    },
};

// ==================== MESSAGE API ====================

export const messageAPI = {
    // Get conversation between two users
    getConversation: async (userId1, userId2, limit = 50, skip = 0) => {
        try {
            const response = await api.get(
                `/messages/conversation/${userId1}/${userId2}?limit=${limit}&skip=${skip}`
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch conversation' };
        }
    },

    // Get all conversations for a user
    getConversations: async (userId) => {
        try {
            const response = await api.get(`/messages/conversations/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch conversations' };
        }
    },

    // Get unread message count
    getUnreadCount: async (userId) => {
        try {
            const response = await api.get(`/messages/unread/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch unread count' };
        }
    },

    // Send message (REST API fallback)
    sendMessage: async (messageData) => {
        try {
            const response = await api.post('/messages', messageData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to send message' };
        }
    },

    // Mark message as read
    markAsRead: async (messageId) => {
        try {
            const response = await api.put(`/messages/${messageId}/read`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to mark as read' };
        }
    },

    // Delete message
    deleteMessage: async (messageId) => {
        try {
            const response = await api.delete(`/messages/${messageId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to delete message' };
        }
    },
};

// ==================== FRIEND API ====================

export const friendAPI = {
    // Gửi lời mời kết bạn
    sendRequest: async (userId) => {
        try {
            const response = await api.post(`/friends/request/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to send friend request' };
        }
    },

    // Chấp nhận lời mời kết bạn
    acceptRequest: async (userId) => {
        try {
            const response = await api.post(`/friends/accept/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to accept friend request' };
        }
    },

    // Từ chối lời mời kết bạn
    declineRequest: async (userId) => {
        try {
            const response = await api.post(`/friends/decline/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to decline friend request' };
        }
    },

    // Hủy lời mời đã gửi
    cancelRequest: async (userId) => {
        try {
            const response = await api.delete(`/friends/request/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to cancel friend request' };
        }
    },

    // Hủy kết bạn (unfriend)
    unfriend: async (userId) => {
        try {
            const response = await api.delete(`/friends/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to unfriend' };
        }
    },

    // Lấy danh sách bạn bè
    getFriends: async () => {
        try {
            const response = await api.get('/friends');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to get friends list' };
        }
    },

    // Lấy lời mời đã nhận
    getReceivedRequests: async () => {
        try {
            const response = await api.get('/friends/requests/received');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to get received requests' };
        }
    },

    // Lấy lời mời đã gửi
    getSentRequests: async () => {
        try {
            const response = await api.get('/friends/requests/sent');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to get sent requests' };
        }
    },

    // Đếm số lời mời chờ
    getPendingCount: async () => {
        try {
            const response = await api.get('/friends/requests/count');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to get pending count' };
        }
    },

    // Kiểm tra trạng thái với 1 user
    getStatus: async (userId) => {
        try {
            const response = await api.get(`/friends/status/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to get friendship status' };
        }
    },

    // Tìm kiếm người dùng
    searchUsers: async (query) => {
        try {
            const response = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to search users' };
        }
    }
};

// ==================== HEALTH CHECK ====================

export const checkServerHealth = async () => {
    try {
        const response = await axios.get(`${API_URL.replace('/api', '')}/api/health`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: 'Server is not responding' };
    }
};

export default api;