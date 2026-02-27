// server.js  (or app.js)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const multer = require('multer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Fail fast if JWT_SECRET is missing (loaded via config/secrets.js)
const { JWT_SECRET } = require('./config/secrets');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

/* ─── 1. Security headers ──────────────────────────────────── */
app.use(helmet());

/* ─── 2. Allowed-origin lists ──────────────────────────────── */
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

/* ─── 3. CORS middleware ───────────────────────────────────── */
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

/* ─── 4. Rate limiting ─────────────────────────────────────── */
app.use('/api/', generalLimiter);

/* ─── 5. Body-parser & multer ──────────────────────────────── */
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

const upload = multer({ storage: multer.memoryStorage() });

/* ─── 6. Routes ────────────────────────────────────────────── */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/posts', require('./routes/blogRoutes')(upload));
app.use('/api/portal', require('./routes/portalRoutes')(upload));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaders', require('./routes/leaderRoutes')(upload));


/* ─── 7. Start server ─────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
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

/* ─── Socket.io Authentication Middleware ──────────────────── */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'member_portal') {
      socket.userId = decoded.membership_no;
      socket.userName = decoded.name;
    } else {
      return next(new Error('Invalid token type'));
    }
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
});

// Track online users: { membership_no: Set<socketId> }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // ─── Join Chat ───
  // Validate userId matches authenticated identity
  socket.on('join_chat', ({ userId }) => {
    // Force userId from authenticated socket to prevent impersonation
    const authenticatedId = socket.userId;
    if (userId !== authenticatedId) {
      socket.emit('error', { message: 'User ID mismatch' });
      return;
    }

    // Track online status
    if (!onlineUsers.has(authenticatedId)) {
      onlineUsers.set(authenticatedId, new Set());
    }
    onlineUsers.get(authenticatedId).add(socket.id);

    // Join a personal room for direct messages
    socket.join(`user:${authenticatedId}`);

    // Broadcast online status
    io.emit('user_online', { userId: authenticatedId });
  });

  // ─── Send Message (real-time + persist) ───
  // Force senderId from authenticated socket identity
  socket.on('send_message', async ({ receiverId, content, type }) => {
    const senderId = socket.userId; // Always use authenticated identity
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
  // Use authenticated identity for senderId
  socket.on('typing_start', ({ receiverId }) => {
    io.to(`user:${receiverId}`).emit('typing_start', { senderId: socket.userId });
  });

  socket.on('typing_stop', ({ receiverId }) => {
    io.to(`user:${receiverId}`).emit('typing_stop', { senderId: socket.userId });
  });

  // ─── Mark messages as read ───
  socket.on('mark_read', async ({ senderId }) => {
    const readerId = socket.userId; // Always use authenticated identity
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
  });
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
