# Authentication Fix Guide

## Problem Summary

The frontend is receiving **401 Unauthorized** errors when trying to delete or update posts because it's not sending the JWT authentication token in the request headers.

### Error Message
```
Failed to delete post: {"success":false,"message":"No token provided. Authorization header must be in format: Bearer <token>"}
```

## Root Cause

The backend requires authentication for POST, PUT, and DELETE operations on posts (see `routes/blogRoutes.js`):
- ✅ GET requests are public (no auth needed)
- ❌ POST, PUT, DELETE require `Authorization: Bearer <token>` header

The frontend is making these requests **without** the authorization header.

## Solution

### Step 1: Include the API Helper in Your Frontend

Copy the `frontend-api-helper.js` file to your frontend project and include it in your HTML:

```html
<script src="js/api-helper.js"></script>
```

### Step 2: Update Your Login Flow

Replace your existing login code with:

```javascript
// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const result = await AuthAPI.login(username, password);
    
    if (result.success) {
      console.log('Login successful!', result.user);
      alert(`Welcome ${result.user.username}!`);
      
      // Redirect to appropriate page
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
  }
});
```

### Step 3: Update Delete Post Function

Replace your existing delete function with:

```javascript
async function deletePost(postId) {
  // Check if user is admin
  if (!AuthUser.isAdmin()) {
    alert('Only admins can delete posts');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this post?')) {
    return;
  }
  
  try {
    const result = await PostsAPI.delete(postId);
    
    if (result.success) {
      alert('Post deleted successfully!');
      
      // Remove the post from the DOM
      const postElement = document.getElementById(`post-${postId}`);
      if (postElement) {
        postElement.remove();
      }
      
      // Or reload the posts list
      loadPosts();
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete post: ' + error.message);
  }
}
```

### Step 4: Update Edit/Update Post Function

Replace your existing update function with:

```javascript
async function updatePost(postId) {
  // Check if user is admin
  if (!AuthUser.isAdmin()) {
    alert('Only admins can update posts');
    return;
  }
  
  const title = document.getElementById('editTitle').value;
  const content = document.getElementById('editContent').value;
  
  if (!title || !content) {
    alert('Title and content are required');
    return;
  }
  
  try {
    const result = await PostsAPI.update(postId, { title, content });
    
    if (result.success) {
      alert('Post updated successfully!');
      
      // Close modal or redirect
      closeEditModal();
      
      // Reload posts
      loadPosts();
    }
  } catch (error) {
    console.error('Update error:', error);
    alert('Failed to update post: ' + error.message);
  }
}
```

### Step 5: Show/Hide Admin Controls on Page Load

Add this to every page that has admin controls:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Update UI based on authentication status
  updateUIForAuth();
  
  // Load content
  loadPosts(); // or loadMembers(), etc.
});
```

## Quick Fix for Existing Code

If you want to quickly fix your existing code without using the helper, here's the minimal change:

```javascript
// Store token after login
localStorage.setItem('authToken', response.token);

// Use token in delete request
async function deletePost(postId) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`http://localhost:5000/api/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,  // ← THIS IS THE KEY LINE
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}

// Use token in update request
async function updatePost(postId, data) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`http://localhost:5000/api/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,  // ← THIS IS THE KEY LINE
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}
```

## Testing the Fix

### Using cURL (Backend Test)

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Delete post WITH token (should work)
curl -X DELETE http://localhost:5000/api/posts/6 \
  -H "Authorization: Bearer $TOKEN"

# 3. Update post WITH token (should work)
curl -X PUT http://localhost:5000/api/posts/6 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","content":"Updated content"}'
```

### Using Browser Console (Frontend Test)

```javascript
// 1. Login
const loginResult = await AuthAPI.login('admin', 'admin123');
console.log('Login:', loginResult);

// 2. Verify token is stored
console.log('Token:', AuthToken.get());
console.log('User:', AuthUser.get());

// 3. Try to delete a post
const deleteResult = await PostsAPI.delete(6);
console.log('Delete:', deleteResult);
```

## Common Issues

### Issue 1: "No token provided"
**Cause:** Token not being sent in Authorization header  
**Fix:** Ensure you're adding `Authorization: Bearer ${token}` to headers

### Issue 2: "Invalid token"
**Cause:** Token is malformed or corrupted  
**Fix:** Check that you're extracting the token correctly from login response

### Issue 3: "Token has expired"
**Cause:** Token expired (default: 24 hours)  
**Fix:** Login again to get a new token

### Issue 4: Edit/Delete buttons not showing
**Cause:** UI not updated after login  
**Fix:** Call `updateUIForAuth()` after successful login

## Security Notes

1. **Never expose JWT_SECRET** - It's in your `.env` file (gitignored)
2. **Use HTTPS in production** - Tokens can be intercepted over HTTP
3. **Token expiration** - Default is 24h, adjust in `.env` with `JWT_EXPIRES_IN`
4. **Password strength** - Now requires minimum 8 characters (updated in authController.js)

## Files Modified

- ✅ `controllers/authController.js` - Added JWT_SECRET validation
- ✅ `middleware/auth.js` - Already correctly validates tokens
- ✅ `routes/blogRoutes.js` - Already requires auth for protected routes
- 📝 `frontend-api-helper.js` - NEW: Complete API helper for frontend
- 📝 `test-auth-flow.sh` - NEW: Test script for authentication flow

## Next Steps

1. Copy `frontend-api-helper.js` to your frontend project
2. Update your login, delete, and update functions to use the helper
3. Test the functionality in your browser
4. Verify edit/delete buttons show only for admin users

Need help with any specific part? Let me know!
