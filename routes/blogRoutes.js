const express = require('express');
const postCtrl = require('../controllers/blogController');
const { requireAuth } = require('../middleware/auth');
const { requireAnyAuth } = require('../middleware/anyAuth');

module.exports = (upload) => {
    const router = express.Router();

    // All routes are now protected to ensure community privacy
    router.get('/', requireAuth, postCtrl.getAll);
    router.get('/:id', requireAuth, postCtrl.getOne);

    // Write operations (require authentication)
    router.post('/', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), postCtrl.create);
    router.put('/:id', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), postCtrl.update);
    router.delete('/:id', requireAuth, postCtrl.remove);

    // ── Video View Tracking ────────────────────────────────────────────────────
    // POST /api/v1/posts/:id/view
    //   Records a view. Accepts BOTH member-portal tokens AND admin tokens.
    //   Called by the frontend whenever a video starts playing.
    router.post('/:id/view', requireAnyAuth, postCtrl.recordView);

    // GET /api/v1/posts/:id/viewers?page=1&limit=20
    //   Admin-only. Returns paginated list of everyone who watched the video.
    router.get('/:id/viewers', requireAuth, postCtrl.getViewers);

    return router;
};
