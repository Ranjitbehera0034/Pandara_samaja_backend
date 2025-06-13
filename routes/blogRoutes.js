const express = require('express');
const router = express.Router();
const postCtrl = require('../controllers/blogController');

router.get('/', postCtrl.getAll);
router.post('/', postCtrl.create);
router.delete('/:id', postCtrl.remove);

module.exports = router;
