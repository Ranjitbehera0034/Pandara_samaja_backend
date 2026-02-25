const express = require('express');
const leaderController = require('../controllers/leaderController');
const { requireAuthAdmin } = require('../middleware/auth');

module.exports = (upload) => {
    const router = express.Router();

    // Public lookup
    router.get('/', leaderController.getAllLeaders);
    router.get('/:id', leaderController.getLeaderById);

    // Admin secure operations
    router.post('/', requireAuthAdmin, upload.single('image'), leaderController.createLeader);
    router.put('/:id', requireAuthAdmin, upload.single('image'), leaderController.updateLeader);
    router.delete('/:id', requireAuthAdmin, leaderController.deleteLeader);

    return router;
};
