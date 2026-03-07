# 🔧 Pandara Samaja Backend — Release v1.0.0

**Release Date:** 2026-03-07  
**Tag:** `v1.0.0`  
**Type:** 🚀 Initial Production Release

---

## 🆕 What's New in v1.0.0

This is the first production release of the Pandara Samaja backend API.

### ✅ Authentication
- Firebase Phone OTP authentication for member portal
- JWT access tokens with configurable expiry
- TOTP-based MFA for admin accounts (Google Authenticator compatible)
- QR code generation for MFA setup

### ✅ Member Management
- Member registration + admin approval workflow
- HOF (Head of Family) model with linked family members
- Profile photo upload to Google Drive
- Member search, filter, and Excel export

### ✅ Leaders Directory
- Full CRUD with image optimization (WebP via Sharp)
- Hierarchical filtering: State / District / Taluka / Panchayat
- `GET /leaders/locations` endpoint for distinct location lists per level

### ✅ Matrimony Module
- Member form submission and file upload (PDF/image)
- Admin review queue with approve / reject / correction-needed actions
- Admin direct candidate creation (bypasses queue, auto-approved)
- Candidate photo upload and profile management

### ✅ Community Features
- Social feed with posts, likes, comments
- Blog/announcement management
- Real-time notifications + messaging (Socket.io)
- Community gallery

### ✅ Image Proxy
- `GET /api/v1/image-proxy/:fileId` — Server-side Google Drive proxy
- ETags for 304 Not Modified responses
- `Cache-Control: public, max-age=31536000, immutable` (1-year browser cache)
- In-memory MIME type cache (24h) to minimize Drive API calls
- Transparent 1×1 GIF fallback on error — no broken image icons

### ✅ Audit Log
- Tracks logins (device, location, IP, time)
- Action log for posts, likes, comments, and matrimony submissions

### ✅ Security
- `helmet` for HTTP security headers
- `express-rate-limit` on all public endpoints
- Zod schema validation on all request bodies
- `bcryptjs` password hashing

---

## 🏗️ Infrastructure

| Service | Provider |
|---------|---------|
| API Hosting | Render (Web Service) |
| Database | PostgreSQL (Render managed DB) |
| File Storage | Google Drive (API v3) |
| Auth (Members) | Firebase Phone Auth |
| Auth (Admins) | JWT + TOTP |

---

## ⚙️ Breaking Changes

None — initial release.

---

## 🐛 Known Issues

- `image-proxy` returns 404 for files uploaded manually to Google Drive without the app's upload flow (those files are not set to public access). Files uploaded via the app are always public.
- `BACKEND_URL` must be correctly set to allow image proxy to function correctly.

---

## 📋 Environment Variables Required

See `.env.example` for the full list. Minimum required for production:

```
DATABASE_URL
JWT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
DRIVE_FOLDER_ID
FIREBASE_SERVICE_ACCOUNT (or GOOGLE_CREDENTIALS)
```

---

## 🚀 Deployment

Deployed to Render via `render.yaml`. Set all environment variables in the Render dashboard.

```bash
npm start    # node server.js
```

---

## 🔗 Related

- [Frontend Release v1.0.0](https://github.com/Ranjitbehera0034/Pandara_samaja/releases/tag/v1.0.0)
- [Live API](https://pandara-samaja-backend.onrender.com/api/v1)
