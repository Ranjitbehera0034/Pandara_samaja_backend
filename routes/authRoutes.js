const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register); // Can be protected later

// Protected routes
router.get('/verify', requireAuth, AuthController.verifyToken);
router.get('/me', requireAuth, AuthController.getCurrentUser);

module.exports = router;
