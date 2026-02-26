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

      // MFA implementation
      if (user.is_mfa_active) {
        // Just return a token indicating MFA is needed
        const mfaToken = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
            is_mfa_pending: true
          },
          JWT_SECRET,
          { expiresIn: '5m' } // Short lived token
        );
        return res.json({
          success: true,
          mfa_required: true,
          token: mfaToken,
          message: 'MFA code required'
        });
      }

      // If MFA is not active, but the user is an admin, force them to set it up!
      if (!user.is_mfa_active && (user.role === 'admin' || user.role === 'super_admin')) {
        const tempToken = jwt.sign(
          { id: user.id, username: user.username, role: user.role, mfa_setup_pending: true },
          JWT_SECRET,
          { expiresIn: '15m' }
        );
        return res.json({
          success: true,
          mfa_setup_required: true,
          token: tempToken,
          message: 'MFA setup required'
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
      if (user.role === 'admin' || user.role === 'super_admin') {
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

  // --- MFA Logic ---
  static async setupMfa(req, res) {
    try {
      const user = req.user;
      if (!user.id) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const speakeasy = require('speakeasy');
      const qrcode = require('qrcode');

      const secret = speakeasy.generateSecret({
        name: `PandaraSamaja (${user.username})`
      });

      // Save secret to user
      await UserModel.updateMfaSecret(user.id, secret.base32);

      qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return res.status(500).json({ success: false, message: 'QR Generate Error' });
        res.json({
          success: true,
          secret: secret.base32,
          qrCode: data_url
        });
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'MFA setup failed' });
    }
  }

  static async verifyMfa(req, res) {
    try {
      const user = req.user; // user from the temp token
      const { code } = req.body;

      if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

      const dbUser = await UserModel.findById(user.id);
      if (!dbUser || !dbUser.mfa_secret) {
        return res.status(400).json({ success: false, message: 'MFA not configured' });
      }

      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: dbUser.mfa_secret,
        encoding: 'base32',
        token: code,
        window: 1 // Allow 30 seconds drift either way
      });

      if (verified) {
        // If they were setting it up, activate it
        if (!dbUser.is_mfa_active) {
          await UserModel.activateMfa(user.id);
        }

        // Full login!
        await UserModel.updateLastLogin(user.id);

        const token = jwt.sign(
          {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
          success: true,
          message: 'MFA Verified, Login successful',
          token,
          user: {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role
          }
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid MFA Code' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'MFA verification failed' });
    }
  }
}

module.exports = AuthController;