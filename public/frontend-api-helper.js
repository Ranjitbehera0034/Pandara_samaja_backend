/**
 * API Helper Utility for Frontend
 * This file provides helper functions to make authenticated API calls
 */

const API_BASE_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5000/api/v1'
    : window.location.origin + '/api/v1';

// Token management
const AuthToken = {
    get: () => localStorage.getItem('authToken'),
    set: (token) => localStorage.setItem('authToken', token),
    remove: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('portalToken');
    },
    exists: () => !!localStorage.getItem('authToken') || !!localStorage.getItem('portalToken'),

    // Portal specific token
    getPortal: () => localStorage.getItem('portalToken'),
    setPortal: (token) => localStorage.setItem('portalToken', token)
};

// User management
const AuthUser = {
    get: () => {
        const user = localStorage.getItem('authUser');
        return user ? JSON.parse(user) : null;
    },
    set: (user) => localStorage.setItem('authUser', JSON.stringify(user)),
    remove: () => localStorage.removeItem('authUser'),
    isAdmin: () => {
        const user = AuthUser.get();
        return user && user.role === 'admin';
    }
};

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = AuthToken.get();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    // Add authorization header if token exists
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        // Handle unauthorized responses
        if (response.status === 401) {
            // Token expired or invalid - clear auth data
            AuthToken.remove();
            AuthUser.remove();

            // Redirect to login if not already there
            if (!window.location.pathname.includes('admin.html')) {
                window.location.href = 'admin.html';
            }

            throw new Error(data.message || 'Authentication required');
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// ============================================
// AUTH API
// ============================================

const AuthAPI = {
    /**
     * Login user
     */
    login: async (username, password) => {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.success && data.token) {
            AuthToken.set(data.token);
            AuthUser.set(data.user);
        }

        return data;
    },

    /**
     * Logout user
     */
    logout: () => {
        AuthToken.remove();
        AuthUser.remove();
        window.location.href = 'admin.html';
    },

    /**
     * Verify current token
     */
    verify: async () => {
        return await apiRequest('/auth/verify');
    },

    /**
     * Get current user info
     */
    getCurrentUser: async () => {
        return await apiRequest('/auth/me');
    }
};

// ============================================
// POSTS API
// ============================================

const PostsAPI = {
    /**
     * Get all posts
     */
    getAll: async () => {
        return await apiRequest('/posts');
    },

    /**
     * Get single post by ID
     */
    getOne: async (id) => {
        return await apiRequest(`/posts/${id}`);
    },

    /**
     * Create new post (requires auth)
     */
    create: async (postData) => {
        return await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        });
    },

    /**
     * Update post (requires auth)
     */
    update: async (id, postData) => {
        return await apiRequest(`/posts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        });
    },

    /**
     * Delete post (requires auth)
     */
    delete: async (id) => {
        return await apiRequest(`/posts/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// MEMBERS API
// ============================================

const MembersAPI = {
    /**
     * Get all members
     */
    getAll: async () => {
        return await apiRequest('/members');
    },

    /**
     * Get single member by ID
     */
    getOne: async (id) => {
        return await apiRequest(`/members/${id}`);
    },

    /**
     * Create new member (requires auth)
     */
    create: async (memberData) => {
        return await apiRequest('/members', {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    },

    /**
     * Update member (requires auth)
     */
    update: async (id, memberData) => {
        return await apiRequest(`/members/${id}`, {
            method: 'PUT',
            body: JSON.stringify(memberData)
        });
    },

    /**
     * Delete member (requires auth)
     */
    delete: async (id) => {
        return await apiRequest(`/members/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// CANDIDATES API
// ============================================

const CandidatesAPI = {
    /**
     * Get all candidates
     */
    getAll: async () => {
        return await apiRequest('/candidates');
    },

    /**
     * Get single candidate by ID
     */
    getOne: async (id) => {
        return await apiRequest(`/candidates/${id}`);
    },

    /**
     * Create new candidate with photo upload (requires auth)
     */
    create: async (formData) => {
        const token = AuthToken.get();

        const response = await fetch(`${API_BASE_URL}/candidates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type for FormData - browser will set it with boundary
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    },

    /**
     * Update candidate (requires auth)
     */
    update: async (id, formData) => {
        const token = AuthToken.get();

        const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    },

    /**
     * Delete candidate (requires auth)
     */
    delete: async (id) => {
        return await apiRequest(`/candidates/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// PORTAL (MEMBER) API
// ============================================

const PortalAPI = {
    /**
     * Start login process (sends WhatsApp OTP)
     */
    login: async (membership_no, mobile) => {
        return await apiRequest('/portal/login', {
            method: 'POST',
            body: JSON.stringify({ membership_no, mobile })
        });
    },

    /**
     * Verify WhatsApp OTP
     */
    verify: async (membership_no, mobile, otp) => {
        const data = await apiRequest('/portal/verify', {
            method: 'POST',
            body: JSON.stringify({ membership_no, mobile, otp })
        });

        if (data.success && data.token) {
            AuthToken.setPortal(data.token);
            AuthUser.set(data.member);
        }

        return data;
    },

    /**
     * Verify OTPless Token (One-Tap Login)
     */
    verifyOtpless: async (otplessToken) => {
        const data = await apiRequest('/portal/verify-otpless', {
            method: 'POST',
            body: JSON.stringify({ otplessToken })
        });

        if (data.success && data.token) {
            AuthToken.setPortal(data.token);
            AuthUser.set(data.member);
        }

        return data;
    },

    /**
     * Get member profile
     */
    getProfile: async () => {
        const token = AuthToken.getPortal();
        return await apiRequest('/portal/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
};

// ============================================
// UI HELPERS
// ============================================

/**
 * Show/hide admin controls based on authentication
 */
function updateUIForAuth() {
    const isAdmin = AuthUser.isAdmin();
    const adminControls = document.querySelectorAll('.admin-only, .edit-btn, .delete-btn');

    adminControls.forEach(element => {
        if (isAdmin) {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });

    // Update login/logout buttons
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn && logoutBtn) {
        if (AuthToken.exists()) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = '';
        } else {
            loginBtn.style.display = '';
            logoutBtn.style.display = 'none';
        }
    }
}

/**
 * Check if user is authenticated, redirect if not
 */
function requireAuth() {
    if (!AuthToken.exists()) {
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

/**
 * Check if user is admin, redirect if not
 */
function requireAdmin() {
    if (!AuthUser.isAdmin()) {
        alert('Admin access required');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============================================
// EXAMPLE USAGE
// ============================================

/*
// In your login form:
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const result = await AuthAPI.login(username, password);
    
    if (result.success) {
      alert('Login successful!');
      window.location.href = 'index.html';
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});

// To delete a post:
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) {
    return;
  }
  
  try {
    const result = await PostsAPI.delete(postId);
    
    if (result.success) {
      alert('Post deleted successfully!');
      // Refresh the posts list
      loadPosts();
    }
  } catch (error) {
    alert('Failed to delete post: ' + error.message);
  }
}

// To update a post:
async function updatePost(postId) {
  const title = document.getElementById('postTitle').value;
  const content = document.getElementById('postContent').value;
  
  try {
    const result = await PostsAPI.update(postId, { title, content });
    
    if (result.success) {
      alert('Post updated successfully!');
    }
  } catch (error) {
    alert('Failed to update post: ' + error.message);
  }
}

// On page load, update UI based on auth status:
document.addEventListener('DOMContentLoaded', () => {
  updateUIForAuth();
});
*/
