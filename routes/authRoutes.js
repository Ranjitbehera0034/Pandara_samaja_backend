const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register); // Can be protected later

// Protected routes (require auth, but some require only temp token)
router.post('/mfa/setup', requireAuth, AuthController.setupMfa);
router.post('/mfa/verify', requireAuth, AuthController.verifyMfa);

// Protected routes
router.get('/verify', requireAuth, AuthController.verifyToken);
router.get('/me', requireAuth, AuthController.getCurrentUser);
router.post('/notify-login', requireAuth, AuthController.notifyLogin);

module.exports = router;
