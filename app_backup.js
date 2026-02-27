// server.js  (or app.js)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
require('dotenv').config();

const app = express();

/* ─── 1. Allowed-origin lists ──────────────────────────────── */
const allowedOriginsDev = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:4001',
  'http://127.0.0.1:4001',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

/*  add both bare + www versions of the front-end,
    and keep the Render domain in case you test directly */
const allowedOriginsProd = [
  'https://nikhilaodishapandarasamaja.in',
  'https://www.nikhilaodishapandarasamaja.in',
  'https://pandara-samaja-backend.onrender.com',
  // Allow local frontend in production mode for testing
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

const allowedOrigins =
  process.env.NODE_ENV === 'production' ? allowedOriginsProd
    : allowedOriginsDev;

/* ─── 2. CORS middleware ───────────────────────────────────── */
app.use(
  cors({
    origin(origin, cb) {
      // Postman / curl (no Origin header)
      if (!origin || origin === 'null') return cb(null, true);

      // Strict allow-list match
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // OPTIONAL: allow any sub-domain of *.nikhilaodishapandarasamaja.in
      const regex = /^https?:\/\/(?:.+\.)?nikhilaodishapandarasamaja\.in$/i;
      if (regex.test(origin)) return cb(null, true);

      return cb(new Error('Not allowed by CORS: ' + origin));
    }
    // credentials: true  // ← enable only if you really need cookies / auth headers
  })
);

/* ─── 2b. Security Middleware (Helmet + Rate Limiting) ────── */
const helmet = require('helmet');
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required if serving images across origins over an API
}));

const rateLimit = require('express-rate-limit');
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply the rate limiting middleware to all API requests
app.use('/api/', globalLimiter);

/* ─── 3. Body-parser & routes ─────────────────────────────── */
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

/* ─── 3. Upload folder + multer ───────────────────────────── */
const upload = multer({ storage: multer.memoryStorage() });

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/posts', require('./routes/blogRoutes')(upload));
app.use('/api/portal', require('./routes/portalRoutes')(upload));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaders', require('./routes/leaderRoutes')(upload));

/* ─── 3.5 API Version 1 (v1) routes ───────────────────────────── */
// Mount the same routes dynamically to `/v1` namespace to provide API Versioning
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/v1/members', require('./routes/memberRoutes'));
app.use('/api/v1/posts', require('./routes/blogRoutes')(upload));
app.use('/api/v1/portal', require('./routes/portalRoutes')(upload));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/leaders', require('./routes/leaderRoutes')(upload));

// ── Webhooks (Third Party Service Callbacks) ──
app.use('/api/v1/webhooks', require('./routes/webhookRoutes'));

/* ─── 3.6 Global Error Handler ────────────────────────────── */
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

/* ─── 4. Start server ─────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`⚠️  SECURITY: Change default admin password immediately!`);
});

// Initialize Socket.io
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Attach io to app so it can be used in routes/controllers
app.set('io', io);

// Track online users: { membership_no: Set<socketId> }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // ─── Join Chat ───
  // Client sends: { userId: membership_no }
  socket.on('join_chat', ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join a personal room for direct messages
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit('user_online', { userId });

    console.log(`👤 User ${userId} joined (${onlineUsers.get(userId).size} connections)`);
  });

  // ─── Send Message (real-time + persist) ───
  socket.on('send_message', async ({ senderId, receiverId, content, type }) => {
    if (!senderId || !receiverId || !content) return;

    try {
      const portal = require('./models/portalModel');

      // Persist to database
      const savedMsg = await portal.saveMessage(senderId, receiverId, content.trim(), type || 'text');

      // Get sender info for the message payload
      const senderProfile = await portal.getMemberProfile(senderId);

      const messagePayload = {
        id: savedMsg.id.toString(),
        senderId: savedMsg.sender_id,
        senderName: senderProfile?.name || 'Unknown',
        senderAvatar: senderProfile?.profile_photo_url || null,
        receiverId: savedMsg.receiver_id,
        content: savedMsg.content,
        timestamp: savedMsg.created_at,
        read: false,
        type: savedMsg.type
      };

      // Send to receiver's room
      io.to(`user:${receiverId}`).emit('receive_message', messagePayload);

      // Also echo back to sender (confirmation)
      socket.emit('message_sent', messagePayload);

      // Create a notification for the receiver
      try {
        await portal.createNotification(
          receiverId,
          'message',
          senderId,
          `sent you a message`,
          null
        );
        // Push notification count update to receiver
        const unread = await portal.getUnreadNotificationCount(receiverId);
        io.to(`user:${receiverId}`).emit('notification_count', { count: unread });
      } catch (notifErr) {
        console.error('Notification error:', notifErr);
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ─── Typing indicators ───
  socket.on('typing_start', ({ senderId, receiverId }) => {
    io.to(`user:${receiverId}`).emit('typing_start', { senderId });
  });

  socket.on('typing_stop', ({ senderId, receiverId }) => {
    io.to(`user:${receiverId}`).emit('typing_stop', { senderId });
  });

  // ─── Mark messages as read ───
  socket.on('mark_read', async ({ readerId, senderId }) => {
    try {
      const portal = require('./models/portalModel');
      await portal.markMessagesRead(readerId, senderId);
      // Notify sender that their messages were read
      io.to(`user:${senderId}`).emit('messages_read', { readerId });
    } catch (err) {
      console.error('Mark read error:', err);
    }
  });

  // ─── Get online status ───
  socket.on('get_online_users', () => {
    const online = Array.from(onlineUsers.keys());
    socket.emit('online_users', online);
  });

  // ─── Disconnect ───
  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        // Broadcast offline status
        io.emit('user_offline', { userId });
      }
    }
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`💡 Solution: Kill the existing process or use a different port:`);
    console.error(`   - Kill existing: lsof -ti:${PORT} | xargs kill`);
    console.error(`   - Use different port: PORT=5001 npm start`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
