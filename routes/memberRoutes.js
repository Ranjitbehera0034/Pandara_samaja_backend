// routes/members.js (example)
const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const memberController = require('../controllers/memberController');
const { requireAuth, requireAuthAdmin, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { memberSchema } = require('../validators/memberValidators');
const apicache = require('apicache');
const cache = apicache.middleware;

const router = express.Router();

// Public routes (with optional auth for admin check)
// Cache standard searches and directory scans to relieve database pressure
router.get('/search', optionalAuth, memberController.search);
router.get('/', optionalAuth, memberController.getAll);

// Export endpoint — admin only (contains raw Aadhaar + mobile data)
router.get('/export', requireAuthAdmin, memberController.exportExcel);

// Protected routes (require authentication)
router.post('/', requireAuth, validate({ body: memberSchema }), memberController.create);  // Create single member
router.post('/import', requireAuth, upload.single('file'), memberController.importExcel);
router.post('/import-rows', requireAuth, memberController.importRows);
router.put('/:id', requireAuth, validate({ body: memberSchema }), memberController.update);
router.delete('/:id', requireAuth, memberController.delete);

// Public routes (must be last to avoid conflict with specific paths)
router.get('/:id', optionalAuth, memberController.getOne);

module.exports = router;
