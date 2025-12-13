# Backend Setup Guide

## Overview
This backend has been updated to match the frontend requirements with JWT authentication, protected admin endpoints, and full CRUD operations for candidates, posts, and members.

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install the existing dependencies. Additionally, you need to install the JWT and bcrypt packages:

```bash
npm install jsonwebtoken bcryptjs
```

### 2. Database Setup

Run the SQL schema to create the users table:

```bash
psql $DATABASE_URL -f schema/users.sql
```

Or manually run the SQL from `schema/users.sql` in your PostgreSQL database.

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development

# Google Drive (if using photo uploads)
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

**IMPORTANT:** Change the `JWT_SECRET` to a strong, random string in production!

### 4. Default Admin Account

The schema includes a default admin account:
- **Username:** `admin`
- **Password:** `admin123`

**IMPORTANT:** Change this password immediately after first login using the password update endpoint!

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Login with username/password | No |
| POST | `/api/auth/register` | Register new user | No |
| GET | `/api/auth/verify` | Verify JWT token | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |

**Login Request:**
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### Candidates (`/api/candidates`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/candidates` | Get all candidates | No |
| GET | `/api/candidates?gender=male` | Filter by gender | No |
| GET | `/api/candidates/:id` | Get one candidate | No |
| POST | `/api/candidates` | Create candidate | **Yes** |
| PUT | `/api/candidates/:id` | Update candidate | **Yes** |
| DELETE | `/api/candidates/:id` | Delete candidate | **Yes** |

### Blog Posts (`/api/posts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/posts` | Get all posts | No |
| GET | `/api/posts/:id` | Get one post | No |
| POST | `/api/posts` | Create post | **Yes** |
| PUT | `/api/posts/:id` | Update post | **Yes** |
| DELETE | `/api/posts/:id` | Delete post | **Yes** |

### Members (`/api/members`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/members` | Get all members | No |
| GET | `/api/members/export` | Export to Excel | No |
| POST | `/api/members/import` | Import from Excel file | **Yes** |
| POST | `/api/members/import-rows` | Import JSON rows | **Yes** |

## Authentication Usage

### For Protected Endpoints

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Example with fetch:**
```javascript
const response = await fetch('http://localhost:5000/api/candidates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

**Example with curl:**
```bash
curl -X POST http://localhost:5000/api/candidates \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","gender":"male",...}'
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## File Structure

```
.
├── app.js                          # Main server file
├── config/
│   ├── db.js                       # PostgreSQL connection
│   └── googleDrive.js              # Google Drive upload utility
├── middleware/
│   └── auth.js                     # JWT authentication middleware
├── routes/
│   ├── authRoutes.js              # Authentication endpoints
│   ├── candidateRoutes.js         # Matrimony candidates
│   ├── memberRoutes.js            # Members management
│   └── blogRoutes.js              # Blog posts
├── controllers/
│   ├── authController.js          # Auth logic
│   ├── candidateController.js     # Candidate CRUD
│   ├── memberController.js        # Member import/export
│   └── blogController.js          # Post CRUD
├── models/
│   ├── userModel.js               # User database operations
│   ├── candidateModel.js          # Candidate queries
│   ├── memberModel.js             # Member queries
│   └── blogModel.js               # Post queries
└── schema/
    └── users.sql                  # Users table schema
```

## Security Notes

1. **JWT Secret:** Always use a strong, random secret in production
2. **Default Password:** Change the default admin password immediately
3. **HTTPS:** Use HTTPS in production to protect JWT tokens
4. **Token Expiry:** Tokens expire after 24 hours by default
5. **CORS:** Configure allowed origins in `app.js` for your frontend domain

## Testing

### Test Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Verify token
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer <token>"
```

### Test Protected Endpoints
```bash
# Create a candidate (requires auth)
curl -X POST http://localhost:5000/api/candidates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","gender":"male",...}'
```

## Troubleshooting

### "No token provided" Error
- Ensure you're sending the Authorization header
- Check the format: `Bearer <token>` (with space)

### "Token has expired" Error
- Login again to get a new token
- Consider increasing JWT_EXPIRES_IN in .env

### "Invalid token" Error
- Ensure JWT_SECRET is the same across restarts
- Check that the token wasn't modified

### Database Connection Error
- Verify DATABASE_URL in .env
- Ensure PostgreSQL is running
- Check database permissions

## Next Steps

1. Install the new npm packages: `npm install jsonwebtoken bcryptjs`
2. Create the `.env` file with your configuration
3. Run the users table schema: `psql $DATABASE_URL -f schema/users.sql`
4. Start the server: `npm run dev`
5. Test the login endpoint
6. Update the default admin password

The backend is now fully compatible with your frontend!
