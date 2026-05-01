require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

connectDB();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const User = require('./models/User');
const Message = require('./models/Message');

// ==================== ROUTES ====================

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
      ai: '/api/ai',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SecureChat API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (e) {
  console.error('❌ Auth routes failed:', e.message);
}

try {
  app.use('/api/messages', require('./routes/messages'));
  console.log('✅ Message routes loaded');
} catch (e) {
  console.error('❌ Message routes failed:', e.message);
}

try {
  app.use('/api/users', require('./routes/users'));
  console.log('✅ User routes loaded');
} catch (e) {
  console.error('❌ User routes failed:', e.message);
}

try {
  app.use('/api/ai', require('./routes/ai'));
  console.log('✅ AI (Ollama) routes loaded');
} catch (e) {
  console.error('❌ AI routes failed:', e.message);
}

try {
  app.use('/api/friends', require('./routes/friends'));
  console.log('✅ Friend routes loaded');
} catch (e) {
  console.error('❌ Friend routes failed:', e.message);
}

// ==================== WEBSOCKET ====================

const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('user-online', async (userId) => {
    try {
      onlineUsers.set(userId, socket.id);
      userSockets.set(socket.id, userId);
      await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
      io.emit('user-status-change', { userId, status: 'online', timestamp: new Date() });
    } catch (e) {
      console.error('Error in user-online:', e);
    }
  });

  socket.on('send-message', async (data) => {
    try {
      const {
        senderId, recipientId,
        encryptedContent, iv, encryptedKey,
        selfEncryptedContent, selfIv, selfEncryptedKey,
        timestamp, tempId,
      } = data;

      if (!senderId || !recipientId || !encryptedContent || !iv || !encryptedKey) {
        socket.emit('message-error', { error: 'Missing required fields', tempId });
        return;
      }

      const senderObjectId = new mongoose.Types.ObjectId(senderId);
      const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

      const message = new Message({
        sender: senderObjectId,
        recipient: recipientObjectId,
        encryptedContent, iv, encryptedKey,
        selfEncryptedContent: selfEncryptedContent || null,
        selfIv: selfIv || null,
        selfEncryptedKey: selfEncryptedKey || null,
        timestamp: timestamp || new Date(),
        status: 'sent',
      });

      await message.save();
      await message.populate('sender', 'name avatar');

      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', {
          id: message._id.toString(),
          senderId,
          senderName: message.sender.name,
          senderAvatar: message.sender.avatar,
          encryptedContent, iv, encryptedKey,
          timestamp: message.timestamp,
        });
        message.status = 'delivered';
        await message.save();
        socket.emit('message-status', { messageId: message._id.toString(), status: 'delivered' });
      }

      socket.emit('message-sent', {
        tempId,
        messageId: message._id.toString(),
        timestamp: message.timestamp,
        status: message.status,
      });
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message-error', { error: 'Failed to send message', tempId: data.tempId });
    }
  });

  socket.on('typing-start', ({ recipientId, senderId }) => {
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) io.to(recipientSocketId).emit('user-typing', { userId: senderId, isTyping: true });
  });

  socket.on('typing-stop', ({ recipientId, senderId }) => {
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) io.to(recipientSocketId).emit('user-typing', { userId: senderId, isTyping: false });
  });

  socket.on('message-read', async ({ messageId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: 'read', readAt: new Date() },
        { new: true }
      );
      if (message) {
        const senderSocketId = onlineUsers.get(message.sender.toString());
        if (senderSocketId) io.to(senderSocketId).emit('message-read-receipt', { messageId, readAt: message.readAt });
      }
    } catch (e) {
      console.error('Error in message-read:', e);
    }
  });

  socket.on('mark-conversation-read', async ({ userId, partnerId }) => {
    try {
      await Message.updateMany(
        { sender: partnerId, recipient: userId, status: { $ne: 'read' } },
        { status: 'read', readAt: new Date() }
      );
      const partnerSocketId = onlineUsers.get(partnerId);
      if (partnerSocketId) io.to(partnerSocketId).emit('conversation-read', { userId, readAt: new Date() });
    } catch (e) {
      console.error('Error marking conversation as read:', e);
    }
  });

  socket.on('disconnect', async () => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);
      try {
        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
        io.emit('user-status-change', { userId, status: 'offline', lastSeen: new Date() });
      } catch (e) {
        console.error('Error on disconnect:', e);
      }
    }
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong on the server' });
});

// ==================== START ====================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     🚀 SecureChat Server Running         ║
║     📡 Port: ${PORT}                          ║
║     🤖 AI:   Ollama (${process.env.OLLAMA_MODEL || 'llama3.2'})          ║
║     🔐 E2EE: Enabled                      ║
╚═══════════════════════════════════════════╝
  `);
  console.log('📋 Endpoints:');
  console.log('   GET  /api/health');
  console.log('   POST /api/auth/register | /api/auth/login');
  console.log('   GET  /api/users');
  console.log('   GET  /api/messages/conversation/:id1/:id2');
  console.log('   POST /api/ai/smart-reply');
  console.log('   POST /api/ai/summarize');
  console.log('   GET  /api/ai/status\n');
});