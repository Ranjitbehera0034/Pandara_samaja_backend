const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const {
  sendLoginAlert,
  sendPromotionNotification
} = require('../utils/emailService');

// JWT secret key - must be set via environment variables
// (Startup will be refused by middleware/auth.js if this is missing)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment. Refusing to start.');
  process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
class AuthController {
  // Login
  static async login(req, res, next) {
    try {
      const {
        username,
        password
      } = req.body;

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
        const mfaToken = jwt.sign({
          id: user.id,
          username: user.username,
          role: user.role,
          is_mfa_pending: true
        }, JWT_SECRET, {
          expiresIn: '5m'
        } // Short lived token
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
        const tempToken = jwt.sign({
          id: user.id,
          username: user.username,
          role: user.role,
          mfa_setup_pending: true
        }, JWT_SECRET, {
          expiresIn: '15m'
        });
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
      const token = jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role
      }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
      });

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
      next(error);
    }
  }

  // Register new user (admin only)
  static async register(req, res, next) {
    try {
      const {
        username,
        password,
        role,
        membership_no,
        real_name,
        email
      } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Requirement: Admins must be linked to a membership_no
      if ((role === 'admin' || role === 'super_admin') && !membership_no) {
        return res.status(400).json({
          success: false,
          message: 'Administrative accounts must be linked to a Membership Number'
        });
      }

      // Validate password strength
      if (password.length < 8) {
        // Increased to 8 for security
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Check if membership_no is already assigned to another admin
      if (membership_no) {
        const existingAdmin = await UserModel.findByMembershipNo(membership_no);
        if (existingAdmin) {
          return res.status(409).json({
            success: false,
            message: `Membership No. ${membership_no} is already assigned to admin @${existingAdmin.username}`
          });
        }
      }

      // Create user
      const newUser = await UserModel.create(username, password, role || 'user', membership_no, real_name, email);

      // Trigger notification (Non-blocking)
      if (membership_no && (role === 'admin' || role === 'super_admin')) {
        const MemberModel = require('../models/memberModel');
        MemberModel.getOne(membership_no).then(member => {
          if (member) {
            // Use the email provided in the request if member doesn't have one
            const memberWithNewEmail = { ...member, email: email || member.email };
            sendPromotionNotification(memberWithNewEmail, { username, role });
          }
        }).catch(err => console.error('Notify Error:', err));
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          membership_no: newUser.membership_no,
          real_name: newUser.real_name
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
      next(error);
    }
  }

  // Search members for admin assignment (Super Admin ONLY)
  static async searchMembers(req, res, next) {
    try {
      const { query } = req.query;
      if (!query || query.length < 2) {
        return res.json({ success: true, members: [] });
      }

      const MemberModel = require('../models/memberModel');
      const result = await MemberModel.search(query);

      res.json({
        success: true,
        members: result.rows.map(m => ({
          membership_no: m.membership_no,
          name: m.name,
          district: m.district,
          taluka: m.taluka,
          panchayat: m.panchayat,
          mobile: m.mobile
        }))
      });
    } catch (e) {
      console.error('Member search error:', e);
      next(e);
    }
  }

  // Verify token (for testing)
  static async verifyToken(req, res, next) {
    try {
      // Token is already verified by middleware
      res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user info
  static async getCurrentUser(req, res, next) {
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
      next(error);
    }
  }

  // Notify login - called by UI after successful login to send email alert
  static async notifyLogin(req, res, next) {
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
      next(error);
    }
  }

  // --- MFA Logic ---
  static async setupMfa(req, res, next) {
    try {
      const user = req.user;
      if (!user.id) return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      const speakeasy = require('speakeasy');
      const qrcode = require('qrcode');
      const secret = speakeasy.generateSecret({
        name: `PandaraSamaja (${user.username})`
      });

      // Save secret to user
      await UserModel.updateMfaSecret(user.id, secret.base32);
      qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return res.status(500).json({
          success: false,
          message: 'QR Generate Error'
        });
        res.json({
          success: true,
          secret: secret.base32,
          qrCode: data_url
        });
      });
    } catch (e) {
      console.error(e);
      next(e);
    }
  }
  static async verifyMfa(req, res, next) {
    try {
      const user = req.user; // user from the temp token
      const {
        code
      } = req.body;
      if (!code) return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
      const dbUser = await UserModel.findById(user.id);
      if (!dbUser || !dbUser.mfa_secret) {
        return res.status(400).json({
          success: false,
          message: 'MFA not configured'
        });
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
        const token = jwt.sign({
          id: dbUser.id,
          username: dbUser.username,
          role: dbUser.role
        }, JWT_SECRET, {
          expiresIn: JWT_EXPIRES_IN
        });
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
        return res.status(401).json({
          success: false,
          message: 'Invalid MFA Code'
        });
      }
    } catch (e) {
      console.error(e);
      next(e);
    }
  }

  // --- Admin Management (Super Admin ONLY) ---
  static async getAllAdmins(req, res, next) {
    try {
      const users = await UserModel.getAllUsers();
      res.json({
        success: true,
        users
      });
    } catch (e) {
      console.error('Fetch admins error:', e);
      next(e);
    }
  }

  static async deleteAdmin(req, res, next) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (Number(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      await UserModel.delete(id);

      res.json({
        success: true,
        message: 'Admin access revoked successfully'
      });
    } catch (e) {
      console.error('Delete admin error:', e);
      next(e);
    }
  }
}
module.exports = AuthController;