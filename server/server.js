require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import Models
const User = require('./models/User');
const Message = require('./models/Message');

// ==================== API ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'SecureChat Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      messages: '/api/messages',
      users: '/api/users',
      friends: '/api/friends'  // ✅ THÊM ENDPOINT MỚI
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SecureChat API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Import and use routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  const messageRoutes = require('./routes/messages');
  app.use('/api/messages', messageRoutes);
  console.log('✅ Message routes loaded');
} catch (error) {
  console.error('❌ Error loading message routes:', error.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ User routes loaded');
} catch (error) {
  console.error('❌ Error loading user routes:', error.message);
}

// ✅ THÊM FRIEND ROUTES
try {
  const friendRoutes = require('./routes/friends');
  app.use('/api/friends', friendRoutes);
  console.log('✅ Friend routes loaded');
} catch (error) {
  console.error('❌ Error loading friend routes:', error.message);
}

// ==================== WEBSOCKET MANAGEMENT ====================

const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // User comes online
  socket.on('user-online', async (userId) => {
    try {
      onlineUsers.set(userId, socket.id);
      userSockets.set(socket.id, userId);

      console.log(`✅ User ${userId} is now online`);

      // Update database
      await User.findByIdAndUpdate(userId, {
        status: 'online',
        lastSeen: new Date()
      });

      // Broadcast to all clients
      io.emit('user-status-change', {
        userId,
        status: 'online',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error in user-online:', error);
    }
  });

  // Send encrypted message - WITH SELF-ENCRYPTION SUPPORT
  socket.on('send-message', async (data) => {
    try {
      const {
        senderId,
        recipientId,
        encryptedContent,
        iv,
        encryptedKey,
        // ADDED: Self-encrypted fields
        selfEncryptedContent,
        selfIv,
        selfEncryptedKey,
        timestamp,
        tempId
      } = data;

      console.log(`📨 Received message data:`, {
        senderId,
        recipientId,
        hasContent: !!encryptedContent,
        hasSelfContent: !!selfEncryptedContent
      });

      // Validate required fields
      if (!senderId || !recipientId || !encryptedContent || !iv || !encryptedKey) {
        console.error('❌ Missing required fields');
        socket.emit('message-error', {
          error: 'Missing required fields',
          tempId
        });
        return;
      }

      // Convert string IDs to MongoDB ObjectId
      let senderObjectId, recipientObjectId;

      try {
        senderObjectId = new mongoose.Types.ObjectId(senderId);
        recipientObjectId = new mongoose.Types.ObjectId(recipientId);
      } catch (err) {
        console.error('❌ Invalid ObjectId:', err);
        socket.emit('message-error', {
          error: 'Invalid user ID format',
          tempId
        });
        return;
      }

      // Save to database with SELF-ENCRYPTED fields
      const message = new Message({
        sender: senderObjectId,
        recipient: recipientObjectId,
        encryptedContent,
        iv,
        encryptedKey,
        // ADDED: Save self-encrypted version
        selfEncryptedContent: selfEncryptedContent || null,
        selfIv: selfIv || null,
        selfEncryptedKey: selfEncryptedKey || null,
        timestamp: timestamp || new Date(),
        status: 'sent'
      });

      await message.save();
      console.log('✅ Message saved to database:', message._id);

      // Populate sender info
      await message.populate('sender', 'name avatar');

      // Send to recipient if online
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', {
          id: message._id.toString(),
          senderId,
          senderName: message.sender.name,
          senderAvatar: message.sender.avatar,
          encryptedContent,
          iv,
          encryptedKey,
          timestamp: message.timestamp
        });

        // Update to delivered
        message.status = 'delivered';
        await message.save();

        socket.emit('message-status', {
          messageId: message._id.toString(),
          status: 'delivered'
        });

        console.log('✅ Message delivered to recipient');
      } else {
        console.log('⚠️ Recipient is offline');
      }

      // Confirm to sender
      socket.emit('message-sent', {
        tempId,
        messageId: message._id.toString(),
        timestamp: message.timestamp,
        status: message.status
      });

    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('Error stack:', error.stack);
      socket.emit('message-error', {
        error: 'Failed to send message',
        details: error.message,
        tempId: data.tempId
      });
    }
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    const { recipientId, senderId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user-typing', {
        userId: senderId,
        isTyping: true
      });
    }
  });

  socket.on('typing-stop', (data) => {
    const { recipientId, senderId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user-typing', {
        userId: senderId,
        isTyping: false
      });
    }
  });

  // Message read receipt
  socket.on('message-read', async (data) => {
    try {
      const { messageId } = data;

      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          status: 'read',
          readAt: new Date()
        },
        { new: true }
      );

      if (message) {
        const senderSocketId = onlineUsers.get(message.sender.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit('message-read-receipt', {
            messageId,
            readAt: message.readAt
          });
        }
      }
    } catch (error) {
      console.error('Error in message-read:', error);
    }
  });

  // Mark all messages as read
  socket.on('mark-conversation-read', async (data) => {
    try {
      const { userId, partnerId } = data;

      await Message.updateMany(
        {
          sender: partnerId,
          recipient: userId,
          status: { $ne: 'read' }
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );

      // Notify partner
      const partnerSocketId = onlineUsers.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('conversation-read', {
          userId,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  });

  // User disconnects
  socket.on('disconnect', async () => {
    const userId = userSockets.get(socket.id);

    if (userId) {
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);

      console.log(`❌ User ${userId} disconnected`);

      try {
        await User.findByIdAndUpdate(userId, {
          status: 'offline',
          lastSeen: new Date()
        });

        io.emit('user-status-change', {
          userId,
          status: 'offline',
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      }
    }

    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong on the server',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║     🚀 SecureChat Server Running         ║
║                                           ║
║     📡 Port: ${PORT}                          ║
║     🌐 Frontend: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}  ║
║     🔧 API: http://localhost:${PORT}          ║
║     🔌 WebSocket: Enabled                 ║
║     🔐 E2EE: Ready (Self-Encryption)      ║
║     👥 Friends: Enabled                   ║
║                                           ║
╚═══════════════════════════════════════════╝
    `);

  console.log('\n📋 Available endpoints:');
  console.log('   GET  /api/health');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/users');
  console.log('   GET  /api/messages/conversation/:id1/:id2');
  console.log('   POST /api/friends/request/:userId');
  console.log('   GET  /api/friends');
  console.log('   GET  /api/friends/requests/received\n');
});