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


module.exports = { app, allowedOrigins };
