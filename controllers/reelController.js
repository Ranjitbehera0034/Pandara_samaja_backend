const Reel = require('../models/reelModel');
const { uploadToFirebase, UPLOAD_PATHS } = require('../utils/firebaseStorage');

/**
 * GET /api/v1/portal/reels
 */
exports.getReels = async (req, res, next) => {
    try {
        const { membership_no, mobile } = req.user || {};
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const reels = await Reel.getAll({ 
            membershipNo: membership_no, 
            mobile, 
            limit: parseInt(limit), 
            offset 
        });

        // Proxy video URLs for private storage access
        const proxiedReels = reels.map(r => {
            let video_url = r.video_url;
            if (video_url && video_url.includes('storage.googleapis.com')) {
                const pathMatch = video_url.split('/').slice(4).join('/');
                video_url = `/api/v1/portal/media?path=${encodeURIComponent(pathMatch)}`;
            }
            return {
                ...r,
                id: String(r.id),
                video_url
            };
        });

        res.json({
            success: true,
            reels: proxiedReels
        });
    } catch (err) {
        console.error('Get Reels Error:', err);
        next(err);
    }
};

/**
 * POST /api/v1/portal/reels
 */
exports.createReel = async (req, res, next) => {
    try {
        const { membership_no, mobile, name } = req.user;
        const { caption, music_name } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Video file is required' });
        }

        const video_url = await uploadToFirebase(req.file, UPLOAD_PATHS.REELS(membership_no));

        const reel = await Reel.create({
            authorId: membership_no,
            authorName: name,
            authorMobile: mobile,
            videoUrl: video_url,
            caption,
            musicName: music_name
        });

        res.status(201).json({
            success: true,
            reel: { ...reel, id: String(reel.id) }
        });
    } catch (err) {
        console.error('Create Reel Error:', err);
        next(err);
    }
};

/**
 * POST /api/v1/portal/reels/:id/view
 */
exports.recordView = async (req, res, next) => {
    try {
        await Reel.incrementView(req.params.id);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/portal/reels/:id/share
 */
exports.recordShare = async (req, res, next) => {
    try {
        await Reel.incrementShare(req.params.id);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/portal/reels/:id/like
 */
exports.toggleLike = async (req, res, next) => {
    try {
        const { membership_no, mobile } = req.user;
        const result = await Reel.toggleLike(req.params.id, membership_no, mobile);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/portal/reels/:id
 */
exports.deleteReel = async (req, res, next) => {
    try {
        const { membership_no } = req.user;
        const deleted = await Reel.delete(req.params.id, membership_no);
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Reel not found or unauthorized' });
        }

        res.json({ success: true, message: 'Reel deleted successfully' });
    } catch (err) {
        next(err);
    }
};
