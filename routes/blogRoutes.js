const express = require('express');
const router = express.Router();
const postCtrl = require('../controllers/blogController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.get('/', postCtrl.getAll);
router.get('/:id', postCtrl.getOne);

// Protected routes (require authentication)
router.post('/', requireAuth, postCtrl.create);
router.put('/:id', requireAuth, postCtrl.update);
router.delete('/:id', requireAuth, postCtrl.remove);

module.exports = router;
