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
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
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

/* ─── 3. Body-parser & routes ─────────────────────────────── */
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

/* ─── 3. Upload folder + multer ───────────────────────────── */
const upload = multer({ storage: multer.memoryStorage() });

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/posts', require('./routes/blogRoutes'));


/* ─── 4. Start server ─────────────────────────────────────── */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`⚠️  SECURITY: Change default admin password immediately!`);
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
