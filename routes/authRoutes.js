const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth, requireAuthSuperAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { adminLoginSchema, registerAdminSchema } = require('../validators/authValidators');

// Public routes
router.post('/login', validate({ body: adminLoginSchema }), AuthController.login);

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
