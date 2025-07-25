const express = require('express');
const multer  = require('multer');
const ctrl    = require('../controllers/memberController');

const router = express.Router();

// define upload BEFORE using it
const upload = multer({ dest: 'uploads/' }); // or multer.memoryStorage()

router.get('/members/export', ctrl.exportExcel);
router.post('/members/import', upload.single('file'), ctrl.importExcel); // uses upload

router.get('/members', ctrl.getAll);
router.get('/members/location', ctrl.getByLocation);
router.get('/members/search', ctrl.search);

module.exports = router;
