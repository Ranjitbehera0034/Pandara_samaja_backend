# Debugging Login 401 Error

## Current Status

✅ **Backend is working correctly** - curl with `admin/admin123` returns success
❌ **Frontend getting 401** - Something wrong with what frontend is sending

## How to Debug

### Step 1: Watch the Server Logs

The server now has debug logging enabled. When you try to login from your frontend, **look at the terminal where the server is running**. You'll see:

```
🔍 LOGIN ATTEMPT:
  - Username: "admin"
  - Password: "adm***" (length: 8)
  - Username has spaces? false
  - Full request body: {"username":"admin","password":"admin123"}
```

This will tell you **exactly** what the backend is receiving.

### Step 2: Common Issues

#### Issue 1: Wrong Form Field Names
Your HTML form fields must match what the backend expects:

**❌ Wrong:**
```html
<input name="user" />      <!-- Wrong! Should be "username" -->
<input name="pass" />      <!-- Wrong! Should be "password" -->
```

**✅ Correct:**
```html
<input name="username" />
<input name="password" />
```

#### Issue 2: Not Preventing Form Default Submit
```javascript
// ❌ Wrong - form submits and reloads page
loginForm.addEventListener('submit', () => {
  fetch('/api/auth/login', {...});
});

// ✅ Correct - prevent default submit
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();  // ← MUST have this!
  fetch('/api/auth/login', {...});
});
```

#### Issue 3: Sending Data Incorrectly
```javascript
// ❌ Wrong - not stringifying
body: { username, password }

// ✅ Correct
body: JSON.stringify({ username, password })
```

#### Issue 4: Missing Content-Type Header
```javascript
// ❌ Wrong - no Content-Type
fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({...})
});

// ✅ Correct
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'  // ← MUST have this!
  },
  body: JSON.stringify({...})
});
```

#### Issue 5: Extra Spaces in Input
```javascript
// ❌ Can cause issues if not trimmed
const username = document.getElementById('username').value; // " admin "

// ✅ Trim the values
const username = document.getElementById('username').value.trim();
const password = document.getElementById('password').value.trim();
```

### Step 3: Check Your Frontend Code

Look for your login form handler. It should look like this:

```javascript
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // IMPORTANT!
  
  // Get values and trim
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  console.log('Sending login request:', { username, password: '***' });
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // IMPORTANT!
      },
      body: JSON.stringify({ username, password }) // IMPORTANT!
    });
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (data.success) {
      // Store token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      
      alert('Login successful!');
      window.location.href = 'index.html';
    } else {
      alert('Login failed: ' + data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
  }
});
```

### Step 4: Test in Browser Console

Open your browser's developer console (F12) and run:

```javascript
// Test 1: Check if fetch works
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
.then(r => r.json())
.then(d => console.log('Result:', d));

// Test 2: Check what your form is actually doing
const form = document.getElementById('loginForm'); // or whatever your form ID is
const username = document.getElementById('username').value;
const password = document.getElementById('password').value;
console.log('Form values:', { username, password });
```

### Step 5: Compare Server Logs

After trying to login from your frontend:

1. **Look at the server terminal**
2. **Compare what you see with the test curl command**

**Expected (working):**
```
🔍 LOGIN ATTEMPT:
  - Username: "admin"
  - Password: "adm***" (length: 8)
  - Username has spaces? false
✅ Login successful
```

**Problem examples:**

```
🔍 LOGIN ATTEMPT:
  - Username: undefined/empty    ← Frontend not sending username!
  - Password: undefined/empty    ← Frontend not sending password!
❌ Validation failed
```

```
🔍 LOGIN ATTEMPT:
  - Username: " admin"           ← Extra space at start!
  - Password: "adm***" (length: 8)
❌ User not found: admin         ← Username with space doesn't match
```

```
🔍 LOGIN ATTEMPT:
  - Username: "admin"
  - Password: "Adm***" (length: 8)
❌ Invalid password for user: admin  ← Wrong password!
```

## Quick Test Commands

Run these in terminal to verify backend is working:

```bash
# Should return success
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Should return 401 (wrong password)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'

# Should return 401 (user not found)  
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"wronguser","password":"admin123"}'
```

## Next Steps

1. ✅ Server is running with debug logging
2. 🔍 Try to login from your frontend
3. 👀 Watch the server terminal logs
4. 🐛 Compare what's sent vs what's expected
5. 🔧 Fix the frontend code based on what you see

The logs will tell you **exactly** what's wrong!

## Remove Debug Logging Later

Once you've fixed the issue, you can remove the debug console.log statements from `controllers/authController.js` for cleaner logs in production.
