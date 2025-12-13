# Pandara Samaja Backend

Backend API for the Nikhila Odisha Pandara Samaja website, providing matrimony candidates, member management, and blog functionality with JWT authentication.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up the database:**
```bash
# Run the users table schema
psql $DATABASE_URL -f schema/users.sql
```

4. **Start the server:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup instructions and configuration
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API endpoint documentation with examples
- **[CHANGELOG.md](CHANGELOG.md)** - List of all changes and updates

## 🔑 Key Features

### Authentication System
- JWT-based authentication
- Secure password hashing with bcryptjs
- Role-based access control (admin/user)
- Token expiration and validation

### API Endpoints

#### 🔐 Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - User registration
- `GET /verify` - Token verification
- `GET /me` - Get current user

#### 👥 Matrimony Candidates (`/api/candidates`)
- `GET /` - List all candidates
- `GET /?gender=male|female` - Filter by gender
- `GET /:id` - Get single candidate
- `POST /` 🔒 - Create candidate
- `PUT /:id` 🔒 - Update candidate
- `DELETE /:id` 🔒 - Delete candidate

#### 📝 Blog Posts (`/api/posts`)
- `GET /` - List all posts
- `GET /:id` - Get single post
- `POST /` 🔒 - Create post
- `PUT /:id` 🔒 - Update post
- `DELETE /:id` 🔒 - Delete post

#### 👨‍👩‍👧‍👦 Members (`/api/members`)
- `GET /` - List all members
- `GET /export` - Export to Excel
- `POST /import` 🔒 - Import from Excel
- `POST /import-rows` 🔒 - Import from JSON

🔒 = Requires authentication

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/db_name

# JWT
JWT_SECRET=your-secure-random-secret-key
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development

# Google Drive (for photo uploads)
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

### CORS Configuration

Allowed origins are configured in `app.js`:

**Development:**
- http://localhost:5000
- http://127.0.0.1:5000

**Production:**
- https://nikhilaodishapandarasamaja.in
- https://www.nikhilaodishapandarasamaja.in
- https://pandara-samaja-backend.onrender.com

## 🔐 Authentication

### Default Admin Account

```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT:** Change this password immediately after first deployment!

### Using Protected Endpoints

1. **Login to get token:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { token } = await response.json();
```

2. **Use token in requests:**
```javascript
const response = await fetch('http://localhost:5000/api/candidates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(candidateData)
});
```

## 📁 Project Structure

```
.
├── app.js                      # Main application entry point
├── package.json                # Dependencies and scripts
├── .env.example                # Environment variables template
├── README.md                   # This file
├── SETUP.md                    # Detailed setup guide
├── API_REFERENCE.md            # API documentation
├── CHANGELOG.md                # Version history
├── config/
│   ├── db.js                  # PostgreSQL connection pool
│   └── googleDrive.js         # Google Drive upload utility
├── middleware/
│   └── auth.js                # JWT authentication middleware
├── routes/
│   ├── authRoutes.js         # Authentication endpoints
│   ├── candidateRoutes.js    # Matrimony candidates
│   ├── memberRoutes.js       # Member management
│   └── blogRoutes.js         # Blog posts
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── candidateController.js # Candidate CRUD operations
│   ├── memberController.js   # Member import/export
│   └── blogController.js     # Post CRUD operations
├── models/
│   ├── userModel.js          # User database operations
│   ├── candidateModel.js     # Candidate queries
│   ├── memberModel.js        # Member queries
│   └── blogModel.js          # Post queries
└── schema/
    └── users.sql             # Users table schema
```

## 🧪 Testing

### Test Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save the token from the response, then:
export TOKEN="your-jwt-token-here"

# Test protected endpoint
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test post"}'
```

### Test Public Endpoints
```bash
# Get all candidates
curl http://localhost:5000/api/candidates

# Get posts
curl http://localhost:5000/api/posts

# Export members
curl http://localhost:5000/api/members/export -o members.xlsx
```

## 🛡️ Security Features

- ✅ JWT token-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Protected admin endpoints
- ✅ Token expiration (24h default)
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection protection (parameterized queries)

## 📦 Dependencies

### Production
- **express** - Web framework
- **pg** - PostgreSQL client
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **cors** - CORS middleware
- **multer** - File uploads
- **exceljs** - Excel file handling
- **googleapis** - Google Drive integration
- **dotenv** - Environment variables

### Development
- **nodemon** - Auto-reload during development

## 🚢 Deployment

### Deploy to Render

1. **Set environment variables in Render dashboard:**
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `GOOGLE_DRIVE_FOLDER_ID`

2. **Run database migration:**
```bash
psql $DATABASE_URL -f schema/users.sql
```

3. **Deploy:**
```bash
git push
```

### Deploy to Other Platforms

See [SETUP.md](SETUP.md) for platform-specific instructions.

## 🐛 Troubleshooting

### "No token provided" Error
- Ensure Authorization header format: `Bearer <token>`
- Check that token is being sent with request

### "Token has expired" Error
- Login again to get new token
- Adjust `JWT_EXPIRES_IN` in .env if needed

### Database Connection Error
- Verify `DATABASE_URL` in .env
- Check PostgreSQL is running
- Verify network connectivity

### CORS Error
- Add your frontend domain to allowed origins in `app.js`
- Check that origin header matches exactly

## 📝 API Response Formats

### Success Response
```json
{
  "id": 1,
  "title": "Sample Post",
  "content": "Content here...",
  "created_at": "2025-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

or

```json
{
  "error": "Error description"
}
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

ISC

## 🔗 Related Projects

- **Frontend Repository:** [Pandara Samaja Frontend](https://github.com/your-org/pandara-samaja-frontend)
- **Live Site:** [https://nikhilaodishapandarasamaja.in](https://nikhilaodishapandarasamaja.in)

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review server logs
3. Verify environment configuration
4. Open an issue on GitHub

---

Made with ❤️ for Nikhila Odisha Pandara Samaja
