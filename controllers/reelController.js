const Reel = require('../models/reelModel');
const { UPLOAD_PATHS } = require('../utils/firebaseStorage');
const admin = require('../config/firebase');
const path = require('path');

/**
 * GET /api/v1/reels
 */
exports.getReels = async (req, res, next) => {
    try {
        const { membership_no, mobile } = req.portalMember || {};
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
            return { ...r, id: String(r.id), video_url };
        });

        res.json({ success: true, reels: proxiedReels });
    } catch (err) {
        console.error('Get Reels Error:', err);
        next(err);
    }
};

/**
 * GET /api/v1/reels/upload-url?filename=myvideo.mp4
 * Returns a signed upload URL so the client can PUT the video directly
 * to Firebase Storage — no video bytes pass through the Render server.
 */
exports.getUploadUrl = async (req, res, next) => {
    try {
        const { membership_no } = req.portalMember;
        const { filename, contentType } = req.query;

        if (!filename || !contentType) {
            return res.status(400).json({ success: false, message: 'filename and contentType are required' });
        }

        // Validate content type
        if (!contentType.startsWith('video/')) {
            return res.status(400).json({ success: false, message: 'Only video files are allowed' });
        }

        const ext = path.extname(filename) || '.mp4';
        const storagePath = `${UPLOAD_PATHS.REELS(membership_no)}/${Date.now()}_${membership_no}${ext}`;

        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        // Generate a signed URL valid for 15 minutes for a resumable PUT upload
        const [signedUrl] = await file.getSignedUrl({
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType,
        });

        return res.json({
            success: true,
            uploadUrl: signedUrl,
            storagePath, // frontend sends this back when creating the reel record
        });
    } catch (err) {
        console.error('Get upload URL error:', err);
        next(err);
    }
};

/**
 * POST /api/v1/reels
 * Creates a reel record from an already-uploaded video path.
 * Body: { storagePath, caption, music_name }
 */
exports.createReel = async (req, res, next) => {
    try {
        const { membership_no, mobile, name } = req.portalMember;
        const { storagePath, caption, music_name } = req.body;

        if (!storagePath) {
            return res.status(400).json({ success: false, message: 'storagePath is required. Upload the video first.' });
        }

        // Validate the path belongs to this user
        const expectedPrefix = UPLOAD_PATHS.REELS(membership_no);
        if (!storagePath.startsWith(expectedPrefix)) {
            return res.status(403).json({ success: false, message: 'Invalid storage path' });
        }

        // Set file as private in Firebase
        const bucket = admin.storage().bucket();
        const fileRef = bucket.file(storagePath);
        const [exists] = await fileRef.exists();
        if (!exists) {
            return res.status(400).json({ success: false, message: 'Video file not found in storage. Upload may have failed.' });
        }

        // Store proxy URL (not the raw Firebase URL)
        const video_url = `/api/v1/portal/media?path=${encodeURIComponent(storagePath)}`;

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
        const { membership_no, mobile } = req.portalMember;
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
        const { membership_no } = req.portalMember;
        const deleted = await Reel.delete(req.params.id, membership_no);
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Reel not found or unauthorized' });
        }

        res.json({ success: true, message: 'Reel deleted successfully' });
    } catch (err) {
        next(err);
    }
};
