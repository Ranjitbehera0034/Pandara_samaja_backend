# API Reference - Quick Guide

## Base URL
- **Development:** `http://localhost:5000`
- **Production:** `https://pandara-samaja-backend.onrender.com`

## Authentication

All protected endpoints require this header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
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

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

## 👥 Matrimony Candidates

### Get All Candidates
```http
GET /api/candidates
```

### Get Candidates by Gender
```http
GET /api/candidates?gender=male
GET /api/candidates?gender=female
```

### Get One Candidate
```http
GET /api/candidates/:id
```

### Create Candidate 🔒
```http
POST /api/candidates
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
- name
- gender
- dob
- age
- height
- bloodGroup
- gotra
- bansha
- education
- technicalEducation
- professionalEducation
- occupation
- father
- mother
- address
- phone
- email
- photo (file)
```

### Update Candidate 🔒
```http
PUT /api/candidates/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

(same fields as create)
```

### Delete Candidate 🔒
```http
DELETE /api/candidates/:id
Authorization: Bearer <token>
```

---

## 📝 Blog Posts

### Get All Posts
```http
GET /api/posts
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Post Title",
    "content": "Post content...",
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

### Get One Post
```http
GET /api/posts/:id
```

### Create Post 🔒
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Post Title",
  "content": "Post content here..."
}
```

### Update Post 🔒
```http
PUT /api/posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

### Delete Post 🔒
```http
DELETE /api/posts/:id
Authorization: Bearer <token>
```

---

## 👨‍👩‍👧‍👦 Members

### Get All Members
```http
GET /api/members
```

**Response:**
```json
[
  {
    "id": 1,
    "membership_no": "M001",
    "name": "John Doe",
    "mobile": "9876543210",
    "male": 2,
    "female": 1,
    "district": "Cuttack",
    "taluka": "Cuttack",
    "panchayat": "Sample GP",
    "village": "Sample Village"
  }
]
```

### Export Members to Excel
```http
GET /api/members/export
```

**Response:** Excel file download (members.xlsx)

### Import from Excel File 🔒
```http
POST /api/members/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
- file (Excel file)
```

**Excel Format:**
| membership_no | name | mobile | male | female | district | taluka | panchayat | village |
|---------------|------|--------|------|--------|----------|--------|-----------|---------|
| M001 | John | 9876... | 2 | 1 | Cuttack | ... | ... | ... |

### Import from JSON 🔒
```http
POST /api/members/import-rows
Authorization: Bearer <token>
Content-Type: application/json

{
  "rows": [
    {
      "membership_no": "M001",
      "name": "John Doe",
      "mobile": "9876543210",
      "male": 2,
      "female": 1,
      "district": "Cuttack",
      "taluka": "Cuttack",
      "panchayat": "Sample GP",
      "village": "Sample Village"
    }
  ]
}
```

**Response:**
```json
{
  "imported": 1,
  "warnings": []
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided. Authorization header must be in format: Bearer <token>"
}
```

### 401 Token Expired
```json
{
  "success": false,
  "message": "Token has expired"
}
```

### 401 Invalid Token
```json
{
  "success": false,
  "message": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Post not found"
}
```

### 500 Server Error
```json
{
  "error": "Failed to fetch posts"
}
```

---

## JavaScript Examples

### Login and Store Token
```javascript
const API_BASE_URL = 'http://localhost:5000';

async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    throw new Error(data.message);
  }
}
```

### Make Authenticated Request
```javascript
async function createPost(title, content) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, content })
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login.html';
      return;
    }
    throw new Error('Failed to create post');
  }

  return await response.json();
}
```

### Upload Candidate with Photo
```javascript
async function createCandidate(formData) {
  const token = localStorage.getItem('token');

  // formData should be a FormData object with all fields including photo
  const response = await fetch(`${API_BASE_URL}/api/candidates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type for FormData, browser sets it automatically
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to create candidate');
  }

  return await response.json();
}
```

### Export Members
```javascript
async function exportMembers() {
  const response = await fetch(`${API_BASE_URL}/api/members/export`);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'members.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Create Post (with auth)
```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post","content":"This is a test post"}'
```

### Get All Candidates
```bash
curl http://localhost:5000/api/candidates
```

### Export Members
```bash
curl http://localhost:5000/api/members/export -o members.xlsx
```

---

## Rate Limits & Notes

- Token expiry: 24 hours (configurable)
- File upload limit: 5MB
- Default admin credentials: `admin` / `admin123` (change immediately!)
- All timestamps are in ISO 8601 format
- Photo uploads are stored in Google Drive

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate username) |
| 500 | Server Error |

---

## Legend

🔒 = Requires Authentication (Bearer token)
