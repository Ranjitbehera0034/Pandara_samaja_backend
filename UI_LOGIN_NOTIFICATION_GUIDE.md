# UI Integration Guide - Login Email Notifications

## Overview
After a successful admin login, the UI should call the `/api/auth/notify-login` endpoint to trigger an email notification.

## API Endpoint

### POST `/api/auth/notify-login`

**Purpose**: Send email notification after admin login

**Authentication**: Required (Bearer Token)

**Request Headers**:
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt-token-from-login>"
}
```

**Request Body**: None required (user info extracted from token)

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Login notification sent"
}
```

**Response Error (401)**:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

## Implementation Examples

### Vanilla JavaScript / Fetch API

```javascript
async function handleLogin(username, password) {
  try {
    // Step 1: Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      alert('Login failed: ' + loginData.message);
      return;
    }

    // Store token
    localStorage.setItem('authToken', loginData.token);
    localStorage.setItem('user', JSON.stringify(loginData.user));

    // Step 2: Send notification (if admin)
    if (loginData.user.role === 'admin') {
      await fetch('http://localhost:5000/api/auth/notify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      // Note: We don't wait for response or show error to user
      // Email sending happens in background
    }

    // Redirect to dashboard
    window.location.href = '/admin/dashboard';

  } catch (error) {
    console.error('Login error:', error);
    alert('An error occurred during login');
  }
}
```

### React Example

```javascript
import { useState } from 'react';
import axios from 'axios';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Login
      const { data } = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (!data.success) {
        alert(data.message);
        return;
      }

      // Store token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Step 2: Send notification (if admin)
      if (data.user.role === 'admin') {
        axios.post('/api/auth/notify-login', {}, {
          headers: {
            'Authorization': `Bearer ${data.token}`
          }
        }).catch(err => {
          // Silently fail - don't block user login
          console.error('Notification error:', err);
        });
      }

      // Redirect
      window.location.href = '/admin/dashboard';

    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### jQuery Example

```javascript
function handleLogin() {
  const username = $('#username').val();
  const password = $('#password').val();

  // Step 1: Login
  $.ajax({
    url: '/api/auth/login',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username, password }),
    success: function(loginData) {
      if (!loginData.success) {
        alert('Login failed: ' + loginData.message);
        return;
      }

      // Store token
      localStorage.setItem('authToken', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));

      // Step 2: Send notification (if admin)
      if (loginData.user.role === 'admin') {
        $.ajax({
          url: '/api/auth/notify-login',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + loginData.token
          },
          error: function(err) {
            // Silently fail
            console.error('Notification error:', err);
          }
        });
      }

      // Redirect
      window.location.href = '/admin/dashboard';
    },
    error: function(err) {
      alert('Login failed');
    }
  });
}
```

## Important Notes

### 1. **Non-blocking Notification**
The notification call should NOT block the user's login flow:
- Don't wait for the notification response
- Don't show errors to the user if notification fails
- Use `.catch()` to handle errors silently

### 2. **Admin Only**
Only send notifications for admin users:
```javascript
if (loginData.user.role === 'admin') {
  // Send notification
}
```

### 3. **Error Handling**
If the notification fails:
- User login is still successful
- User can access the system
- Error is logged to console only

### 4. **SMTP Configuration**
Make sure backend has SMTP configured in `.env`:
```bash
SMTP_USER=nikhilaodishapandarasamaja@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL_TO=nikhilaodishapandarasamaja@gmail.com
```

## Testing

Run the test script:
```bash
node test-login-notification.js
```

Expected output:
```
=== Testing Login Notification Flow ===

Step 1: Logging in as admin...
✅ Login successful!
   Token: eyJhbGciOiJIUzI1NiIs...
   User: admin
   Role: admin

Step 2: Sending login notification email...
✅ Notification sent successfully!
   Message: Login notification sent

📧 Check your email at the configured ALERT_EMAIL_TO address
```

## Flow Diagram

```
User enters credentials
        ↓
POST /api/auth/login
        ↓
Backend validates credentials
        ↓
Returns JWT token + user info
        ↓
UI stores token
        ↓
[If user.role === 'admin']
        ↓
POST /api/auth/notify-login (with token)
        ↓
Backend sends email to configured address
        ↓
UI redirects to dashboard
```

## Troubleshooting

**Email not received?**
1. Check backend logs for SMTP errors
2. Verify `.env` has correct SMTP credentials
3. Check spam folder
4. Verify Gmail app password is correct

**401 Unauthorized on notify-login?**
- Make sure you're sending the Authorization header
- Token should be prefixed with "Bearer "
- Token should be from the login response

**Notification endpoint returns error but login works?**
- This is expected behavior
- Login should never fail because of notification issues
- Check backend logs for the actual error
