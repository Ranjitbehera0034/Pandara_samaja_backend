const express = require('express');
const postCtrl = require('../controllers/blogController');
const { requireAuth } = require('../middleware/auth');

module.exports = (upload) => {
    const router = express.Router();

    // Public routes
    router.get('/', postCtrl.getAll);
    router.get('/:id', postCtrl.getOne);

    // Protected routes (require authentication)
    router.post('/', requireAuth, upload.single('image'), postCtrl.create);
    router.put('/:id', requireAuth, upload.single('image'), postCtrl.update);
    router.delete('/:id', requireAuth, postCtrl.remove);

    return router;
};
