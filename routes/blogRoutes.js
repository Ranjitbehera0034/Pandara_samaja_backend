const express = require('express');
const postCtrl = require('../controllers/blogController');
const { requireAuth } = require('../middleware/auth');

module.exports = (upload) => {
    const router = express.Router();

    // All routes are now protected to ensure community privacy
    router.get('/', requireAuth, postCtrl.getAll);
    router.get('/:id', requireAuth, postCtrl.getOne);

    // Write operations (require authentication)
    router.post('/', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), postCtrl.create);
    router.put('/:id', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), postCtrl.update);
    router.delete('/:id', requireAuth, postCtrl.remove);

    return router;
};
