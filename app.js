// server.js  (or app.js)
const express = require('express');
const cors    = require('cors');
const bodyParser = require('body-parser');
const multer      = require('multer');
require('dotenv').config();

const app = express();

/* ─── 1. Allowed-origin lists ──────────────────────────────── */
const allowedOriginsDev = [
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

/*  add both bare + www versions of the front-end,                                       
    and keep the Render domain in case you test directly */
const allowedOriginsProd = [
  'https://nikhilaodishapandarasamaja.in',
  'https://www.nikhilaodishapandarasamaja.in',
  'https://pandara-samaja-backend.onrender.com'
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

app.use('/api/candidates', require('./routes/candidateRoutes')(upload));
app.use('/api/members',    require('./routes/memberRoutes'));
app.use('/api/posts', require('./routes/blogRoutes'));


/* ─── 4. Start server ─────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
