const Document = require('../models/documentModel');
const { uploadToFirebase, UPLOAD_PATHS } = require('../utils/firebaseStorage');
const pool = require('../config/db');

/**
 * GET /api/v1/admin/documents
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await Document.findAll({
      category,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      documents: result.rows,
      pagination: {
        total: result.total,
        page: parseInt(page),
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/documents
 */
exports.addDocument = async (req, res, next) => {
  try {
    const { title, category, description } = req.body;
    const adminUser = req.user.username;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload to Firebase
    const file_url = await uploadToFirebase(req.file, UPLOAD_PATHS.ADMIN_UPLOAD(adminUser, 'documents'));

    const { rows } = await Document.create({
      title,
      category,
      file_url,
      file_type: req.file.mimetype,
      description,
      uploaded_by: adminUser
    });

    const doc = rows[0];

    // Audit Log
    try {
      await pool.query(
        'INSERT INTO admin_audit_logs (admin_username, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
        [adminUser, 'UPLOAD_DOCUMENT', 'Document', doc.id, JSON.stringify({ title: doc.title, category: doc.category })]
      );
    } catch (e) {
      console.error('Audit log failed:', e);
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/documents/:id
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Document.findById(id);

    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await Document.remove(id);

    // Audit Log
    try {
      await pool.query(
        'INSERT INTO admin_audit_logs (admin_username, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.username, 'DELETE_DOCUMENT', 'Document', id, JSON.stringify({ title: existing.rows[0].title })]
      );
    } catch (e) {
      console.error('Audit log failed:', e);
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
