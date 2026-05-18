import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// ==================== AUTH API ====================

export const authAPI = {
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Registration failed' };
        }
    },

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

    logout: async (userId) => {
        try {
            const response = await api.post('/auth/logout', { userId });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Logout failed' };
        }
    },

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
    getAllUsers: async () => {
        try {
            const response = await api.get('/users');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch users' };
        }
    },

    getUserById: async (userId) => {
        try {
            const response = await api.get(`/users/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch user' };
        }
    },

    updateStatus: async (userId, status) => {
        try {
            const response = await api.put(`/users/${userId}/status`, { status });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to update status' };
        }
    },

    updateAvatar: async (avatar) => {
        try {
            const response = await api.put('/users/avatar', { avatar });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to update avatar' };
        }
    },
};

// ==================== MESSAGE API ====================

export const messageAPI = {
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

    getUnreadCount: async (userId) => {
        try {
            const response = await api.get(`/messages/unread/${userId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch unread count' };
        }
    },

    // ✅ Mới: check unread từ một sender cụ thể
    getUnreadFromSender: async (senderId) => {
        try {
            const response = await api.get(`/messages/unread-from/${senderId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch unread from sender' };
        }
    },

    sendMessage: async (messageData) => {
        try {
            const response = await api.post('/messages', messageData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to send message' };
        }
    },

    markAsRead: async (messageId) => {
        try {
            const response = await api.put(`/messages/${messageId}/read`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to mark as read' };
        }
    },
};

// ==================== FRIEND API ====================

export const friendAPI = {
    sendRequest: async (recipientId) => {
        try {
            const response = await api.post(`/friends/request/${recipientId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to send friend request' };
        }
    },

    getReceivedRequests: async () => {
        try {
            const response = await api.get('/friends/requests/received');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch received requests' };
        }
    },

    getSentRequests: async () => {
        try {
            const response = await api.get('/friends/requests/sent');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch sent requests' };
        }
    },

    acceptRequest: async (requesterId) => {
        try {
            const response = await api.post(`/friends/accept/${requesterId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to accept request' };
        }
    },

    declineRequest: async (requesterId) => {
        try {
            const response = await api.post(`/friends/decline/${requesterId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to decline request' };
        }
    },

    cancelRequest: async (recipientId) => {
        try {
            const response = await api.delete(`/friends/request/${recipientId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to cancel request' };
        }
    },

    getFriends: async () => {
        try {
            const response = await api.get('/friends');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to fetch friends' };
        }
    },

    getPendingCount: async () => {
        try {
            const response = await api.get('/friends/requests/count');
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to get pending count' };
        }
    },

    searchUsers: async (query) => {
        try {
            const response = await api.get(`/users/search/${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Failed to search users' };
        }
    },
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