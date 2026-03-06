const { app, allowedOrigins } = require('./app');
const { logUserAction } = require('./utils/auditLogger');

/* ─── 4. Start server ─────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api/v1`);

  try {
    const matrimonyModel = require('./models/matrimonyApplicationModel');
    await matrimonyModel.ensureTable();
    console.log('✅ Matrimony table ensured');
  } catch (err) {
    console.error('❌ Matrimony table creation failed:', err.message);
  }
});

// Initialize Socket.io
const io = require('socket.io')(server, {
  cors: {
    origin(origin, cb) {
      if (!origin || origin === 'null') return cb(null, true);
      if (allowedOrigins && allowedOrigins.includes(origin)) return cb(null, true);
      const regex = /^https?:\/\/(?:.+\.)?nikhilaodishapandarasamaja\.in$/i;
      if (regex.test(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS: ' + origin));
    },
    methods: ["GET", "POST"],
    transports: ["websocket", "polling"],
    credentials: true // Ensures headers pass smoothly
  }
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Socket.io Authentication Middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    // Standardize user data from token
    socket.decoded = decoded;
    next();
  } catch (err) {
    console.error('Socket Auth Error:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Attach io to app so it can be used in routes/controllers
app.set('io', io);

// Track online users: { membership_no: Set<socketId> }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // ─── Join Chat ───
  // No parameters from client; identity is extracted from verified JWT
  socket.on('join_chat', () => {
    const userId = socket.decoded.membership_no || socket.decoded.id;
    const userMobile = (socket.decoded.mobile || '').replace(/\D/g, '');

    if (!userId || !userMobile) {
      console.warn('❌ Socket join_chat failed: Missing userId or mobile in token');
      return;
    }

    socket.userId = userId;
    socket.userMobile = userMobile;

    const sessionKey = `${userId}-${userMobile}`;

    // Track online status
    if (!onlineUsers.has(sessionKey)) {
      onlineUsers.set(sessionKey, new Set());
    }
    onlineUsers.get(sessionKey).add(socket.id);

    // Join a personal room for direct messages
    socket.join(`user:${sessionKey}`);

    // Broadcast online status
    io.emit('user_online', { userId, mobile: userMobile });

    console.log(`👤 User ${sessionKey} joined (${onlineUsers.get(sessionKey).size} connections)`);
  });

  // ─── Send Message (real-time + persist) ───
  socket.on('send_message', async ({ senderMobile, receiverId, receiverMobile, content, type }) => {
    // Authenticated sender ID from token
    const senderId = socket.decoded.membership_no || socket.decoded.id;

    if (!senderId || !receiverId || !content) return;

    try {
      const portal = require('./models/portalModel');
      const cleanSenderMobile = (senderMobile || '').replace(/\D/g, '');
      const cleanReceiverMobile = (receiverMobile || '').replace(/\D/g, '');

      // Persist to database
      const savedMsg = await portal.saveMessage(senderId, cleanSenderMobile, receiverId, cleanReceiverMobile, content.trim(), type || 'text');

      // Fetch correct sender name/avatar for individual identity
      const senderProfile = await portal.getMemberProfile(senderId);
      let senderName = senderProfile?.name || 'Unknown';
      let senderAvatar = senderProfile?.profile_photo_url || null;

      if (senderProfile && cleanSenderMobile !== (senderProfile.mobile || '').replace(/\D/g, '')) {
        const fm = (senderProfile.family_members || []).find(f => (f.mobile || '').replace(/\D/g, '') === cleanSenderMobile);
        if (fm) {
          senderName = fm.name;
          if (fm.profile_photo_url) senderAvatar = fm.profile_photo_url;
        }
      }

      const messagePayload = {
        id: savedMsg.id.toString(),
        senderId: savedMsg.sender_id,
        senderMobile: savedMsg.sender_mobile,
        senderName,
        senderAvatar,
        receiverId: savedMsg.receiver_id,
        receiverMobile: savedMsg.receiver_mobile,
        content: savedMsg.content,
        timestamp: savedMsg.created_at,
        read: false,
        type: savedMsg.type
      };

      // Send to receiver's room
      io.to(`user:${receiverId}-${cleanReceiverMobile}`).emit('receive_message', messagePayload);

      // Echo back to sender (confirmation)
      socket.emit('message_sent', messagePayload);

      // Log chat message (non-blocking)
      logUserAction(
        null,
        senderName,
        'SEND_MESSAGE',
        'Member',
        receiverId,
        { preview: content.trim().substring(0, 80), type: type || 'text' },
        null,
        socket.handshake.address,
        socket.handshake.headers?.['user-agent'] || null
      );

      // Create a notification for the receiver
      try {
        await portal.createNotification(
          receiverId,
          'message',
          senderId,
          `sent you a message`,
          null,
          null, // actor_name (optional)
          cleanReceiverMobile,
          cleanSenderMobile
        );
        // Push notification count update to receiver
        const unread = await portal.getUnreadNotificationCount(receiverId, cleanReceiverMobile);
        io.to(`user:${receiverId}-${cleanReceiverMobile}`).emit('notification_count', { count: unread });
      } catch (notifErr) {
        console.error('Notification error:', notifErr);
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ─── Typing indicators ───
  socket.on('typing_start', ({ senderId, senderMobile, receiverId, receiverMobile }) => {
    io.to(`user:${receiverId}-${(receiverMobile || '').replace(/\D/g, '')}`).emit('typing_start', { senderId, senderMobile });
  });

  socket.on('typing_stop', ({ senderId, senderMobile, receiverId, receiverMobile }) => {
    io.to(`user:${receiverId}-${(receiverMobile || '').replace(/\D/g, '')}`).emit('typing_stop', { senderId, senderMobile });
  });

  // ─── Mark messages as read ───
  socket.on('mark_read', async ({ readerId, readerMobile, senderId, senderMobile }) => {
    try {
      const portal = require('./models/portalModel');
      const cleanReaderMobile = (readerMobile || '').replace(/\D/g, '');
      const cleanSenderMobile = (senderMobile || '').replace(/\D/g, '');
      await portal.markMessagesRead(readerId, cleanReaderMobile, senderId, cleanSenderMobile);
      // Notify sender that their messages were read
      io.to(`user:${senderId}-${cleanSenderMobile}`).emit('messages_read', { readerId, readerMobile: cleanReaderMobile });
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
    const userMobile = socket.userMobile;
    const sessionKey = `${userId}-${userMobile}`;
    if (userId && onlineUsers.has(sessionKey)) {
      onlineUsers.get(sessionKey).delete(socket.id);
      if (onlineUsers.get(sessionKey).size === 0) {
        onlineUsers.delete(sessionKey);
        // Broadcast offline status
        io.emit('user_offline', { userId, mobile: userMobile });
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
