const express = require('express');
const reelCtrl = require('../controllers/reelController');
const { requirePortalAuth } = require('../middleware/portalAuth');

module.exports = (upload) => {
    const router = express.Router();

    // Reels Feed
    router.get('/', requirePortalAuth, reelCtrl.getReels);

    // Step 1: Get a signed URL to upload video directly to Firebase Storage
    router.get('/upload-url', requirePortalAuth, reelCtrl.getUploadUrl);

    // Step 2: Create reel record after video is uploaded (no file passes through server)
    router.post('/', requirePortalAuth, reelCtrl.createReel);

    // Interactions
    router.post('/:id/view', requirePortalAuth, reelCtrl.recordView);
    router.post('/:id/share', requirePortalAuth, reelCtrl.recordShare);
    router.post('/:id/like', requirePortalAuth, reelCtrl.toggleLike);

    // Delete
    router.delete('/:id', requirePortalAuth, reelCtrl.deleteReel);

    return router;
};
