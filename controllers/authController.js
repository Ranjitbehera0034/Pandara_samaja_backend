const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { sendLoginAlert } = require('../utils/emailService');

// JWT secret key - should be in environment variables
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_SECRET is not defined in .env file!");
  console.warn("⚠️  Using fallback secret for development only.");
  console.warn("⚠️  Please add JWT_SECRET to your .env file for production!");
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
  // Login
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Find user
      const user = await UserModel.findByUsername(username);
      // Security: Use generic error message to prevent username enumeration
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      console.log('✅ Login successful for user:', username);

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Return success response
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Register new user (admin only)
  static async register(req, res) {
    try {
      const { username, password, role } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Validate password strength
      if (password.length < 8) { // Increased to 8 for security
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Create user
      const newUser = await UserModel.create(username, password, role || 'user');

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role
        }
      });
    } catch (error) {
      if (error.message === 'Username already exists') {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }

      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Verify token (for testing)
  static async verifyToken(req, res) {
    try {
      // Token is already verified by middleware
      res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user info
  static async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          lastLogin: user.last_login
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Notify login - called by UI after successful login to send email alert
  static async notifyLogin(req, res) {
    try {
      // This endpoint should be called with the user info and token
      const user = req.user; // From auth middleware

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Only send alerts for admin logins
      if (user.role === 'admin') {
        await sendLoginAlert(user, req);
        return res.json({
          success: true,
          message: 'Login notification sent'
        });
      }

      res.json({
        success: true,
        message: 'No notification required for non-admin users'
      });
    } catch (error) {
      console.error('Notify login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification'
      });
    }
  }
}

module.exports = AuthController;