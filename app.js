// server.js (or app.js)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
require('dotenv').config();

const app = express();

/* ─── 1. Allowed-origin lists ──────────────────────────────── */
const allowedOrigins = [
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
  'http://127.0.0.1:4173',
  'https://nikhilaodishapandarasamaja.in',
  'https://www.nikhilaodishapandarasamaja.in',
  'https://pandara-samaja-backend.onrender.com'
];

/* ─── 2. CORS middleware ───────────────────────────────────── */
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origin === 'null') return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      const regex = /^https?:\/\/(?:.+\.)?nikhilaodishapandarasamaja\.in$/i;
      if (regex.test(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS: ' + origin));
    }
  })
);

/* ─── 2b. Security Middleware (Helmet + Rate Limiting) ────── */
const helmet = require('helmet');
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const rateLimit = require('express-rate-limit');
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use('/api/v1/', globalLimiter);

/* ─── 3. Body-parser & static ─────────────────────────────── */
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// DASHBOARD TOOLS (super-admin protected)
const path = require('path');
const { requireAuthSuperAdmin } = require('./middleware/auth');
app.use('/tools', requireAuthSuperAdmin, express.static(path.join(__dirname, 'public')));
app.get('/dashboard-demo', requireAuthSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'super-dashboard.html'));
});

/* ─── 4. Upload folder + multer ───────────────────────────── */
const upload = multer({ storage: multer.memoryStorage() });

/* ─── API Routes (Compatibility Alias) ────────────────────── */
// These routes are redundant with /api/v1/ but are required for older client builds
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/posts', require('./routes/blogRoutes')(upload));
app.use('/api/portal', require('./routes/portalRoutes')(upload));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaders', require('./routes/leaderRoutes')(upload));

/* ─── API Version 1 (v1) routes ───────────────────────────── */
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/v1/members', require('./routes/memberRoutes'));
app.use('/api/v1/posts', require('./routes/blogRoutes')(upload));
app.use('/api/v1/portal', require('./routes/portalRoutes')(upload));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/leaders', require('./routes/leaderRoutes')(upload));
app.use('/api/v1/webhooks', require('./routes/webhookRoutes'));

// Image proxy — streams Google Drive images server-side to avoid 403 hotlink blocks
app.use('/api/image-proxy', require('./routes/imageProxyRoutes'));
app.use('/api/v1/image-proxy', require('./routes/imageProxyRoutes'));

/* ─── Global Error Handler ────────────────────────────── */
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = { app, allowedOrigins };
