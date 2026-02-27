const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema, mfaVerifySchema } = require('../validators/authValidators');

// Public routes (rate limited + validated)
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);

// Protected routes (require auth, but some require only temp token)
router.post('/mfa/setup', requireAuth, AuthController.setupMfa);
router.post('/mfa/verify', requireAuth, validate(mfaVerifySchema), AuthController.verifyMfa);

// Protected routes
router.get('/verify', requireAuth, AuthController.verifyToken);
router.get('/me', requireAuth, AuthController.getCurrentUser);
router.post('/notify-login', requireAuth, AuthController.notifyLogin);

module.exports = router;
