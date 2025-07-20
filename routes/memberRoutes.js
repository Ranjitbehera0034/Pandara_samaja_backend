const express = require('express');
const controller = require('../controllers/memberController');
const router = express.Router();
router.get('/', controller.getAll);
router.get('/by-location', controller.getByLocation);
router.get('/search', controller.search);
router.post('/export/excel', controller.exportExcel);
module.exports = router;
