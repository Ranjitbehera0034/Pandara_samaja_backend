# Server Management Guide

## Starting the Server

### Normal Start
```bash
npm start
```

### Start on Different Port
```bash
PORT=5001 npm start
```

### Development Mode (with auto-reload)
If you want auto-reload on file changes, install nodemon:
```bash
npm install --save-dev nodemon
```

Then add to `package.json` scripts:
```json
"dev": "nodemon app.js"
```

Run with:
```bash
npm run dev
```

## Common Issues

### Issue: "Port 5000 is already in use"

**Solution 1: Kill the existing process**
```bash
lsof -ti:5000 | xargs kill
```

**Solution 2: Use a different port**
```bash
PORT=5001 npm start
```

**Solution 3: Find and kill manually**
```bash
# Find the process
lsof -i:5000

# Kill it
kill -9 <PID>
```

### Issue: Server stops immediately after starting

**Cause:** Usually a port conflict or missing environment variables

**Check:**
1. Is another server running? `lsof -ti:5000`
2. Is DATABASE_URL set in `.env`?
3. Check the error message in the terminal

## Server Status

### Check if server is running
```bash
curl http://localhost:5000/api/posts
```

### Check what's running on port 5000
```bash
lsof -i:5000
```

### View server logs
The server logs appear in the terminal where you ran `npm start`

## Database Setup

### First Time Setup
```bash
# Create users table and admin user
node setup-db.js
```

### Reset Admin Password
```bash
# Reset to default (admin/admin123)
node reset-admin-password.js
```

## Testing the API

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test with Authentication
```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# 2. Use token to delete a post
curl -X DELETE http://localhost:5000/api/posts/1 \
  -H "Authorization: Bearer $TOKEN"
```

## Environment Variables

Required in `.env`:
```env
# Database connection
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Secret (IMPORTANT!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server port (optional, defaults to 5000)
PORT=5000

# Node environment
NODE_ENV=development
```

## Quick Commands Reference

```bash
# Start server
npm start

# Setup database
node setup-db.js

# Reset admin password
node reset-admin-password.js

# Kill server on port 5000
lsof -ti:5000 | xargs kill

# Check if server is running
curl http://localhost:5000/api/posts

# View what's using port 5000
lsof -i:5000
```

## Default Credentials

After running `setup-db.js` or `reset-admin-password.js`:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change these in production!**

## Troubleshooting

### Server won't start
1. Check if port is in use: `lsof -i:5000`
2. Check `.env` file exists and has DATABASE_URL
3. Check database is running and accessible
4. Look at error messages in terminal

### Login fails (500 error)
1. Check if users table exists: `node setup-db.js`
2. Check DATABASE_URL in `.env`
3. Check database connection

### Login fails (401 error)
1. Check username/password
2. Reset admin password: `node reset-admin-password.js`

### Delete/Update fails (401 error)
1. Check if token is being sent in Authorization header
2. Check token format: `Authorization: Bearer <token>`
3. Check if token has expired (default: 24h)

## Server is Running! ✅

Your server is currently running on:
- **URL:** http://localhost:5000
- **API Base:** http://localhost:5000/api
- **Status:** ✅ Active

### Available Endpoints:
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create post (requires auth)
- `PUT /api/posts/:id` - Update post (requires auth)
- `DELETE /api/posts/:id` - Delete post (requires auth)
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token (requires auth)
- `GET /api/members` - Get all members
- `GET /api/candidates` - Get all candidates
