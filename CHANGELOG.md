# Backend Updates - Changelog

## Summary
Updated the backend to match frontend requirements with full JWT authentication, protected admin endpoints, and complete CRUD operations.

## New Files Created

### 1. Authentication System
- **`schema/users.sql`** - Database schema for users table with default admin account
- **`models/userModel.js`** - User model with password hashing and verification
- **`controllers/authController.js`** - Login, register, and token verification logic
- **`routes/authRoutes.js`** - Authentication endpoints
- **`middleware/auth.js`** - JWT verification middleware (`requireAuth`, `requireAdmin`)

### 2. Documentation
- **`SETUP.md`** - Complete setup and usage guide
- **`CHANGELOG.md`** - This file

## Modified Files

### 1. Routes
- **`routes/candidateRoutes.js`**
  - Added `requireAuth` middleware import
  - Protected POST, PUT, DELETE endpoints
  - Added comments for public vs protected routes

- **`routes/blogRoutes.js`**
  - Added `requireAuth` middleware import
  - Added GET `/:id` endpoint for single post
  - Added PUT `/:id` endpoint for updating posts
  - Protected POST, PUT, DELETE endpoints

- **`routes/memberRoutes.js`**
  - Added `requireAuth` middleware import
  - Exposed GET `/export` endpoint
  - Protected POST `/import` and `/import-rows` endpoints

### 2. Controllers
- **`controllers/blogController.js`**
  - Added `getOne(req, res)` method
  - Added `update(req, res)` method

### 3. Models
- **`models/blogModel.js`**
  - Added `getOne(id)` query
  - Added `update(id, { title, content })` query

### 4. Main Application
- **`app.js`**
  - Added auth routes: `app.use('/api/auth', require('./routes/authRoutes'))`

## API Changes

### New Endpoints

#### Authentication
```
POST   /api/auth/login       - Login with username/password
POST   /api/auth/register    - Register new user
GET    /api/auth/verify      - Verify JWT token (protected)
GET    /api/auth/me          - Get current user info (protected)
```

#### Blog Posts
```
GET    /api/posts/:id        - Get single post
PUT    /api/posts/:id        - Update post (now protected)
```

#### Members
```
GET    /api/members/export   - Export members to Excel
```

### Protected Endpoints (Now Require Auth)

#### Candidates
```
POST   /api/candidates       - Create candidate
PUT    /api/candidates/:id   - Update candidate
DELETE /api/candidates/:id   - Delete candidate
```

#### Blog Posts
```
POST   /api/posts            - Create post
PUT    /api/posts/:id        - Update post
DELETE /api/posts/:id        - Delete post
```

#### Members
```
POST   /api/members/import       - Import from Excel file
POST   /api/members/import-rows  - Import JSON rows
```

## Dependencies Required

Add these to package.json:
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

Install with:
```bash
npm install jsonwebtoken bcryptjs
```

## Environment Variables

New required environment variables in `.env`:
```env
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

## Database Changes

New table: `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

Default admin account:
- Username: `admin`
- Password: `admin123` (should be changed immediately)

## Breaking Changes

### 1. Authentication Required
The following endpoints now require authentication:
- All POST, PUT, DELETE operations for candidates
- All POST, PUT, DELETE operations for posts
- All import operations for members

**Migration:** Frontend must now include JWT token in Authorization header for these operations.

### 2. New Response Format for Auth Endpoints
Login response includes token and user object:
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

## Security Improvements

1. **JWT Authentication** - Secure token-based auth system
2. **Password Hashing** - Using bcryptjs with salt rounds
3. **Protected Admin Endpoints** - Only authenticated users can modify data
4. **Token Expiration** - Tokens expire after configured time (default 24h)
5. **Role-based Access** - Admin role support for future authorization

## Frontend Compatibility

The backend is now fully compatible with the frontend expectations:

✅ POST `/api/auth/login` endpoint exists
✅ JWT token generation and verification
✅ Authorization header support (`Bearer <token>`)
✅ Protected admin endpoints
✅ All CRUD operations for posts
✅ Members export endpoint exposed
✅ Error responses with proper status codes

## Testing Checklist

- [ ] Install dependencies: `npm install jsonwebtoken bcryptjs`
- [ ] Create `.env` file with JWT_SECRET
- [ ] Run users table schema
- [ ] Test login endpoint
- [ ] Test protected endpoints with valid token
- [ ] Test protected endpoints without token (should fail)
- [ ] Test token expiration
- [ ] Test invalid token handling
- [ ] Verify frontend login flow works
- [ ] Verify frontend admin panel operations work

## Rollback Instructions

If you need to rollback these changes:

1. Remove authentication from routes:
   - Remove `requireAuth` middleware from candidateRoutes.js
   - Remove `requireAuth` middleware from blogRoutes.js
   - Remove `requireAuth` middleware from memberRoutes.js

2. Remove auth route from app.js:
   - Comment out `app.use('/api/auth', ...)`

3. Delete new files:
   - middleware/auth.js
   - routes/authRoutes.js
   - controllers/authController.js
   - models/userModel.js
   - schema/users.sql

## Next Steps

1. **Production Setup:**
   - Generate strong JWT_SECRET
   - Change default admin password
   - Enable HTTPS
   - Configure CORS for production domain

2. **Additional Features to Consider:**
   - Password reset functionality
   - Email verification
   - Refresh tokens
   - Rate limiting on auth endpoints
   - Audit logging for admin actions
   - Multi-factor authentication

3. **Database Maintenance:**
   - Add indexes if needed
   - Set up regular backups
   - Monitor user login attempts

## Support

For issues or questions about these changes:
1. Check the SETUP.md file for detailed instructions
2. Verify environment variables are set correctly
3. Check server logs for detailed error messages
4. Ensure all dependencies are installed
