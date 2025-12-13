# Quick Start Guide

## ✅ All Files Updated!

All authentication files have been copied from the worktree to the main directory. Your backend is now ready!

## 📋 Next Steps

### 1. Install New Dependencies

Run this in the `/Users/ranjit/Downloads/Pandara_samaja_backend` directory:

```bash
npm install
```

This will install the new packages: `jsonwebtoken` and `bcryptjs`

### 2. Create Users Table in Database

Run the SQL schema to create the users table. You can do this in several ways:

**Option A: Using psql command line**
```bash
psql postgres://postgres:admin@localhost:5432/pandara_db -f schema/users.sql
```

**Option B: Using pgAdmin or any PostgreSQL client**
Open `schema/users.sql` and execute the SQL commands in your database client.

**Option C: Using Node.js script**
Create a file `setup-db.js`:
```javascript
const pool = require('./config/db');
const fs = require('fs');

async function setup() {
  const sql = fs.readFileSync('./schema/users.sql', 'utf8');
  await pool.query(sql);
  console.log('Users table created successfully!');
  process.exit(0);
}

setup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
```

Then run: `node setup-db.js`

### 3. Verify Environment Variables

Your `.env` file has been updated with JWT configuration:

```env
JWT_SECRET=pandara-samaja-secret-key-change-this-in-production-1764782823
JWT_EXPIRES_IN=24h
```

**For production, change the JWT_SECRET to a more secure random string!**

### 4. Restart Your Server

Stop the current server (Ctrl+C) and restart it:

```bash
npm start
```

Or for development mode with auto-reload:

```bash
npm run dev
```

### 5. Test the Authentication

**Login Endpoint:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

You should get a response with a JWT token:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 6. Test Frontend Connection

Your frontend on `http://127.0.0.1:5500` should now work without CORS errors!

## ✅ What Was Updated

### Files Created:
- ✅ `middleware/auth.js` - JWT authentication middleware
- ✅ `models/userModel.js` - User database operations
- ✅ `controllers/authController.js` - Login/register logic
- ✅ `routes/authRoutes.js` - Auth endpoints
- ✅ `schema/users.sql` - Users table schema

### Files Modified:
- ✅ `app.js` - Added CORS for port 5500, added auth routes
- ✅ `package.json` - Added bcryptjs and jsonwebtoken
- ✅ `.env` - Added JWT_SECRET and JWT_EXPIRES_IN
- ✅ `routes/candidateRoutes.js` - Added authentication to POST/PUT/DELETE
- ✅ `routes/blogRoutes.js` - Added authentication + new endpoints (GET/:id, PUT/:id)
- ✅ `routes/memberRoutes.js` - Added authentication + export endpoint
- ✅ `controllers/blogController.js` - Added getOne and update methods
- ✅ `models/blogModel.js` - Added getOne and update queries

### Documentation Added:
- ✅ `README.md` - Project overview
- ✅ `SETUP.md` - Detailed setup instructions
- ✅ `API_REFERENCE.md` - Complete API documentation
- ✅ `CHANGELOG.md` - List of changes
- ✅ `.env.example` - Environment variables template
- ✅ `QUICK_START.md` - This file

## 🔐 Default Admin Credentials

```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT:** Change this password immediately after first login!

## 🎯 CORS Configuration

The following origins are now allowed in development:
- `http://localhost:5000`
- `http://127.0.0.1:5000`
- `http://localhost:5500` ← Your Live Server
- `http://127.0.0.1:5500` ← Your Live Server
- `http://localhost:3000`
- `http://127.0.0.1:3000`

## 🔍 Troubleshooting

### Error: "Cannot find module 'jsonwebtoken'"
Run: `npm install`

### Error: "relation 'users' does not exist"
Run the SQL schema: `psql <database-url> -f schema/users.sql`

### Still getting CORS errors?
1. Make sure you restarted the server
2. Check the server is running on port 5000
3. Verify your frontend is on port 5500

### Error: "JWT_SECRET is not defined"
Check your `.env` file has the JWT_SECRET line

## 📚 Full Documentation

For complete documentation, see:
- **README.md** - Overview and getting started
- **SETUP.md** - Detailed setup guide
- **API_REFERENCE.md** - API endpoints with examples

---

Your backend is ready! Just complete steps 1-4 above and you're good to go! 🚀
