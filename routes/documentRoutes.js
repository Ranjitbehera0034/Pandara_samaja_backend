const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { requireAuthAdmin } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// All routes here require admin authentication
router.use(requireAuthAdmin);

/**
 * List documents
 * GET /api/v1/admin/documents
 */
router.get('/', documentController.getDocuments);

/**
 * Upload a new document
 * POST /api/v1/admin/documents
 */
router.post('/', upload.single('file'), documentController.addDocument);

/**
 * Delete a document
 * DELETE /api/v1/admin/documents/:id
 */
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
