// routes/members.js (example)
const express = require('express');
const multer  = require('multer');
const upload  = multer({ dest: 'uploads/' });

const memberController = require('../controllers/memberController');

const router = express.Router();

// File upload endpoint (already expected by importExcel)
router.post('/members/import', upload.single('file'), memberController.importExcel);

// New: JSON rows endpoint
router.post('/members/import-rows', memberController.importRows);

module.exports = router;
