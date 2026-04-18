const express = require('express');
const reelCtrl = require('../controllers/reelController');
const { requirePortalAuth } = require('../middleware/portalAuth');

module.exports = (upload) => {
    const router = express.Router();

    // Reels Feed (Publicly visible but requires auth for interaction tracking)
    router.get('/', requirePortalAuth, reelCtrl.getReels);

    // Create Reel
    router.post('/', requirePortalAuth, upload.single('video'), reelCtrl.createReel);

    // Interactions
    router.post('/:id/view', requirePortalAuth, reelCtrl.recordView);
    router.post('/:id/share', requirePortalAuth, reelCtrl.recordShare);
    router.post('/:id/like', requirePortalAuth, reelCtrl.toggleLike);

    // Delete
    router.delete('/:id', requirePortalAuth, reelCtrl.deleteReel);

    return router;
};
