# 🔧 Pandara Samaja — Backend API

<p align="center">
  <strong>REST API + WebSocket server for the Nikhila Odisha Pandara Samaja platform</strong><br/>
  Built with Node.js, Express, PostgreSQL, and Google Drive.
</p>

<p align="center">
  <a href="https://pandara-samaja-backend.onrender.com/api/v1">🌐 Live API</a> ·
  <a href="https://github.com/Ranjitbehera0034/Pandara_samaja">📱 Frontend Repo</a>
</p>

---

## 📁 Project Structure

```
Pandara_samaja_backend/
├── server.js               # Entry point — HTTP + Socket.io server
├── app.js                  # Express app setup, middleware, route mounting
├── render.yaml             # Render deployment config
│
├── config/
│   ├── db.js               # PostgreSQL connection pool (pg)
│   ├── googleDrive.js      # Google Drive upload utility + FOLDER_MAP
│   └── firebase.js         # Firebase Admin SDK setup
│
├── controllers/            # Route handler functions
│   ├── memberController.js
│   ├── leaderController.js
│   ├── matrimonyApplicationController.js
│   ├── candidateController.js
│   ├── blogController.js
│   ├── portalController.js
│   └── auditLogController.js
│
├── routes/                 # Express routers
│   ├── memberRoutes.js
│   ├── leaderRoutes.js
│   ├── matrimonyRoutes.js
│   ├── imageProxyRoutes.js # Google Drive image proxy with CDN caching
│   └── ...
│
├── middleware/
│   ├── auth.js             # JWT verification middleware
│   ├── adminAuth.js        # Admin/Super-admin role guard
│   └── rateLimiter.js      # Express rate limiting
│
├── migrations/             # node-pg-migrate SQL migrations
├── models/                 # DB query helpers (pure SQL, no ORM)
├── validators/             # Zod request validators
├── utils/                  # Shared utility functions
└── tests/                  # Node built-in test runner tests
```

---

## 🚀 Key Features

- **🔐 Authentication** — Firebase Phone OTP (members) + JWT with TOTP/MFA (admins)
- **👥 Member Management** — Registration, approval workflow, HOF (Head of Family) model, Excel export
- **🏛️ Leaders Directory** — Hierarchical (State → District → Taluka → Panchayat) with image uploads
- **💍 Matrimony Module** — Form submission, admin review queue, candidate publishing
- **📰 Blog & Posts** — Rich content with Google Drive media
- **📡 Real-time** — Socket.io for notifications, messaging, and live feed updates
- **🖼️ Image Proxy** — Server-side Google Drive proxy with ETag, 1-year immutable caching
- **📋 Audit Log** — Tracks member logins, actions, devices, and locations
- **🔒 Security** — `helmet`, CORS, rate limiting, input validation via Zod

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 18 |
| Framework | Express 5 |
| Database | PostgreSQL (via `pg`) |
| Migrations | node-pg-migrate |
| Auth | Firebase Admin SDK + JWT (`jsonwebtoken`) |
| File Storage | Google Drive API (`googleapis`) |
| Image Processing | Sharp (WebP conversion + resize) |
| Real-time | Socket.io |
| Validation | Zod |
| Security | Helmet, express-rate-limit, bcryptjs |
| Email | Nodemailer |
| MFA | Speakeasy (TOTP) + QRCode |
| Exports | ExcelJS |
| Linting | ESLint |
| Testing | Node built-in test runner + Supertest |

---

## 🔧 Local Development

### Prerequisites
- Node.js ≥ 18
- PostgreSQL running locally
- Google Cloud project with Drive API enabled
- Firebase project with Phone Auth enabled

### 1. Clone and Install

```bash
git clone https://github.com/Ranjitbehera0034/Pandara_samaja_backend.git
cd Pandara_samaja_backend
npm install
```

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | OAuth2 refresh token with Drive access |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI (oauthplayground for dev) |
| `DRIVE_FOLDER_ID` | Root Google Drive folder ID |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK JSON (base64 encoded) |
| `PORT` | Server port (default: `5000`) |

### 3. Run Migrations

```bash
npm run migrate up
```

### 4. Start Development Server

```bash
npm run dev      # nodemon — auto-restarts on file changes
```

The server starts at `http://localhost:5000`.

---

## 📡 API Overview

All routes are prefixed with `/api/v1`.

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/login` | Admin login |
| `GET` | `/members` | List all members |
| `POST` | `/members` | Register new member |
| `GET` | `/leaders` | Get leaders (filterable by level/location) |
| `GET` | `/leaders/locations` | Get distinct locations for a level |
| `POST` | `/leaders` | Create new leader (with image) |
| `GET` | `/candidates` | List approved matrimony candidates |
| `POST` | `/candidates` | Create candidate (admin direct upload) |
| `GET` | `/admin/matrimony-forms` | Get matrimony review queue |
| `PATCH` | `/admin/matrimony-forms/:id/review` | Approve / reject / correction |
| `GET` | `/image-proxy/:fileId` | Proxy Google Drive image with caching |
| `GET` | `/blogs` | List blog posts |
| `GET` | `/portal/feed` | Community feed |
| `GET` | `/audit-logs` | User activity audit log (admin only) |

---

## 🖼️ Google Drive Folder Structure

```
📁 Pandara_Samaja/             ← DRIVE_FOLDER_ID (root)
│
├── 📁 leaders/                ← Leader profile photos
├── 📁 members/                ← Member profile photos
├── 📁 gallery/                ← Community feed images
├── 📁 matrimony/
│   ├── 📁 photos/             ← Matrimony candidate photos
│   └── 📁 forms/              ← Uploaded matrimony form PDFs
└── 📁 posts/                  ← Blog/announcement cover images
```

Folder IDs are defined in `config/googleDrive.js` under `FOLDER_MAP`.

---

## 🚢 Deployment (Render)

The app is deployed on [Render](https://render.com) using `render.yaml`.

```bash
# Production start command
npm start    # node server.js
```

Environment variables are set via the Render dashboard (not committed to source).

---

## 🧪 Running Tests

```bash
npm test     # node --test tests/*.test.js
```

---

## 📄 License

MIT © Nikhila Odisha Pandara Samaja
