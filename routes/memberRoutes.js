// routes/members.js (example)
const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const memberController = require('../controllers/memberController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (with optional auth for admin check)
router.get('/search', optionalAuth, memberController.search);
router.get('/', optionalAuth, memberController.getAll);

// Export endpoint (can be public or protected based on requirements)
router.get('/export', memberController.exportExcel);

// Protected routes (require authentication)
router.post('/import', requireAuth, upload.single('file'), memberController.importExcel);
router.post('/import-rows', requireAuth, memberController.importRows);
router.put('/:id', requireAuth, memberController.update);
router.delete('/:id', requireAuth, memberController.delete);

// Public routes (must be last to avoid conflict with specific paths)
router.get('/:id', optionalAuth, memberController.getOne);

module.exports = router;
