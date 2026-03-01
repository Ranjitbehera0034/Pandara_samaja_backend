const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth, requireAuthSuperAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { adminLoginSchema, registerAdminSchema } = require('../validators/authValidators');
const rateLimit = require('express-rate-limit');

// Strict rate limiter for login: max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Public routes
router.post('/login', loginLimiter, validate({ body: adminLoginSchema }), AuthController.login);

// Protected routes (Only Super Admin can register/manage users/admins)
router.post('/register', requireAuthSuperAdmin, validate({ body: registerAdminSchema }), AuthController.register);
router.get('/admins', requireAuthSuperAdmin, AuthController.getAllAdmins);
router.delete('/admins/:id', requireAuthSuperAdmin, AuthController.deleteAdmin);
router.get('/search-members', requireAuthSuperAdmin, AuthController.searchMembers);

// Protected routes (require auth, but some require only temp token)
router.post('/mfa/setup', requireAuth, AuthController.setupMfa);
router.post('/mfa/verify', requireAuth, AuthController.verifyMfa);

// Protected routes
router.get('/verify', requireAuth, AuthController.verifyToken);
router.get('/me', requireAuth, AuthController.getCurrentUser);
router.post('/notify-login', requireAuth, AuthController.notifyLogin);

module.exports = router;
