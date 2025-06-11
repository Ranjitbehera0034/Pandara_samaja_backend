const express = require('express');
const router = express.Router();
const controller = require('../controllers/memberController');

router.get('/', controller.getAll);
router.get('/by-location', controller.getByLocation);
router.get('/search', controller.search);
router.post('/bulk-import', controller.bulkImport); 
module.exports = router;
