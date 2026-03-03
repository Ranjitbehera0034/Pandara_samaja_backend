// controllers/portalController.js — Member Portal API handlers
const jwt = require('jsonwebtoken');
const portal = require('../models/portalModel');
const { uploadFile } = require('../config/googleDrive');
const pool = require('../config/db');
const firebaseAdmin = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}
const PORTAL_JWT_EXPIRES = process.env.PORTAL_JWT_EXPIRES || '7d';

/**
 * POST /api/v1/portal/login/firebase
 * Body: { membership_no, mobile, idToken }
 */
exports.loginWithFirebase = async (req, res, next) => {
    try {
        const { membership_no, mobile, idToken } = req.body;

        if (!membership_no || !mobile || !idToken) {
            return res.status(400).json({
                success: false,
                message: 'Missing parameters: membership_no, mobile, and idToken are required'
            });
        }

        const cleanMobile = mobile.replace(/\D/g, '');
        const result = await portal.findByCredentials(membership_no.trim(), cleanMobile);

        if (!result || !result.member) {
            return res.status(401).json({
                success: false,
                message: 'Member lookup failed / unauthorized.'
            });
        }

        // Verify Firebase Token
        let decodedToken;
        try {
            decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        } catch (authErr) {
            console.error('[AUTH] Firebase Verification Failed:', authErr);
            return res.status(401).json({
                success: false,
                message: 'Firebase verification failed or token expired.'
            });
        }

        // Verify that the phone number in the token matches the mobile number
        const firebasePhone = decodedToken.phone_number;
        if (!firebasePhone || !firebasePhone.includes(cleanMobile)) {
            return res.status(401).json({
                success: false,
                message: 'The verified SMS number does not match your registered mobile.'
            });
        }

        const member = result.member;

        // Generate JWT for member portal
        const token = jwt.sign(
            {
                membership_no: member.membership_no,
                name: result.matchedUser && result.matchedUser.name ? result.matchedUser.name : member.name,
                mobile: result.matchedUser?.mobile || cleanMobile,
                relation: result.matchedUser?.relation || 'Self/Head',
                type: 'member_portal'
            },
            JWT_SECRET,
            { expiresIn: PORTAL_JWT_EXPIRES }
        );

        res.json({
            success: true,
            message: 'Firebase Login successful',
            token,
            member: {
                membership_no: member.membership_no,
                name: member.name,
                mobile: member.mobile,
                district: member.district,
                taluka: member.taluka,
                panchayat: member.panchayat,
                village: member.village,
                address: member.address,
                head_gender: member.head_gender,
                profile_photo_url: member.profile_photo_url ? member.profile_photo_url.replace('drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') : null,
                // Mask Aadhaar for security
                aadhar_no: member.aadhar_no ? `********${member.aadhar_no.slice(-4)}` : null,
                family_members: member.family_members || []
            },
            loggedInUser: result.matchedUser
        });

    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════

/**
 * GET /api/portal/me
 * Returns the current member's full profile
 */
exports.getProfile = async (req, res) => {
    try {
        const member = await portal.getMemberProfile(req.portalMember.membership_no);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Determine profile photo for the SPECIFIC logged-in person
        let profilePhotoUrl = member.profile_photo_url;
        const loggedInMobile = (req.portalMember.mobile || '').replace(/\D/g, '');
        const headMobile = (member.mobile || '').replace(/\D/g, '');

        if (loggedInMobile !== headMobile && Array.isArray(member.family_members)) {
            const fm = member.family_members.find(f => (f.mobile || '').replace(/\D/g, '') === loggedInMobile);
            if (fm && fm.profile_photo_url) {
                profilePhotoUrl = fm.profile_photo_url;
            }
        }

        res.json({
            success: true,
            member: {
                membership_no: member.membership_no,
                name: req.portalMember.name || member.name,
                mobile: member.mobile,
                district: member.district,
                taluka: member.taluka,
                panchayat: member.panchayat,
                village: member.village,
                address: member.address,
                head_gender: member.head_gender,
                profile_photo_url: profilePhotoUrl ? profilePhotoUrl.replace('drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') : null,
                // Mask Aadhaar for security
                aadhar_no: member.aadhar_no ? `********${member.aadhar_no.slice(-4)}` : null,
                family_members: member.family_members || []
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PUT /api/portal/profile
 * Update the logged-in member's profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const membershipNo = req.portalMember.membership_no;
        const relation = req.portalMember.relation?.toLowerCase() || '';
        const isHead = relation === 'self/head' || relation === 'self' || relation === 'head';

        let updated;

        if (isHead) {
            // Head can update everything within allowed fields
            const allowedFields = ['name', 'mobile', 'aadhar_no', 'address', 'district', 'taluka', 'panchayat', 'village', 'head_gender', 'male', 'female', 'family_members'];
            const updateData = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            }
            updated = await portal.updateMemberProfile(membershipNo, updateData);
        } else {
            // Family member can ONLY update their specific profile (name, gender) in family_members array.
            // They CANNOT modify root properties, add/delete family members.
            const existingMember = await portal.getMemberProfile(membershipNo);
            if (!existingMember) {
                return res.status(404).json({ success: false, message: 'Member not found' });
            }

            const cleanMobile = (req.portalMember.mobile || '').replace(/\D/g, '').slice(-10);
            const familyMembers = existingMember.family_members || [];

            let found = false;
            const updatedFamily = familyMembers.map(fm => {
                const fmMobile = (fm.mobile || '').replace(/\D/g, '').slice(-10);
                if (fmMobile === cleanMobile) {
                    found = true;
                    // Only update personal fields, NEVER relationship or age or mobile without verification generally, but we'll allow name/gender for now.
                    return {
                        ...fm,
                        name: req.body.name || fm.name,
                        gender: req.body.head_gender || fm.gender // UI uses head_gender field for them
                    };
                }
                return fm;
            });

            if (!found) {
                return res.status(403).json({ success: false, message: 'Unauthorized to update profile' });
            }

            updated = await portal.updateMemberProfile(membershipNo, { family_members: updatedFamily });
        }

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Update failed or member not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            member: {
                membership_no: updated.membership_no,
                name: isHead ? updated.name : req.portalMember.name, // Return appropriate context name
                mobile: updated.mobile,
                district: updated.district,
                taluka: updated.taluka,
                panchayat: updated.panchayat,
                village: updated.village,
                address: updated.address,
                profile_photo_url: updated.profile_photo_url ? updated.profile_photo_url.replace('drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') : null,
                // Mask Aadhaar for security
                aadhar_no: updated.aadhar_no ? `********${updated.aadhar_no.slice(-4)}` : null,
                family_members: updated.family_members || []
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * POST /api/portal/profile/photo
 * Upload a profile photo
 */
exports.uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Update specific family member profile photo
        const url = await uploadFile(req.file);
        await portal.updateFamilyMemberPhoto(
            req.portalMember.membership_no,
            req.portalMember.mobile,
            url
        );

        // Also save to gallery (associated with membership_no)
        await portal.addPhoto(req.portalMember.membership_no, url, `Profile Photo - ${req.portalMember.name}`);

        const cleanedUrl = url ? url.replace('drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') : url;

        res.json({
            success: true,
            message: 'Profile photo uploaded',
            url: cleanedUrl,
            photoUrl: cleanedUrl  // Frontend Profile.tsx expects data.photoUrl
        });
    } catch (error) {
        console.error('Upload profile photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
};

/**
 * DELETE /api/portal/profile/photo
 * Remove a profile photo
 */
exports.deleteProfilePhoto = async (req, res) => {
    try {
        await portal.updateMemberProfile(req.portalMember.membership_no, {
            profile_photo_url: null
        });

        res.json({
            success: true,
            message: 'Profile photo removed'
        });
    } catch (error) {
        console.error('Delete profile photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove photo' });
    }
};


// ═══════════════════════════════════════════════════
//  COMMUNITY POSTS (FEED)
// ═══════════════════════════════════════════════════

/**
 * POST /api/portal/posts
 * Create a new community post (text and/or images)
 */
exports.createPost = async (req, res) => {
    try {
        const { text } = req.body;
        const files = req.files || [];

        if (!text && files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please write something or add a photo'
            });
        }

        // --- Banned Words Check ---
        if (text) {
            const activeBannedWords = await pool.query('SELECT word FROM banned_words');
            if (activeBannedWords.rows.length > 0) {
                const lowerText = text.toLowerCase();
                const containsBannedWord = activeBannedWords.rows.some(r => lowerText.includes(r.word));
                if (containsBannedWord) {
                    return res.status(403).json({ success: false, message: 'Your content contains restricted vocabulary and cannot be published' });
                }
            }
        }

        // Upload images to Google Drive
        const imageUrls = [];
        for (const file of files) {
            try {
                const url = await uploadFile(file);
                imageUrls.push(url);
            } catch (uploadErr) {
                console.error('Image upload error:', uploadErr);
            }
        }

        const member = req.portalMember;

        // Fetch current individual photo
        const profileRes = await pool.query('SELECT profile_photo_url, family_members, mobile FROM members WHERE membership_no = $1', [member.membership_no]);
        let authorPhoto = profileRes.rows[0]?.profile_photo_url;
        if (profileRes.rows[0]) {
            const headMobile = (profileRes.rows[0].mobile || '').replace(/\D/g, '');
            const loggedInMobile = (member.mobile || '').replace(/\D/g, '');
            if (loggedInMobile !== headMobile && Array.isArray(profileRes.rows[0].family_members)) {
                const fm = profileRes.rows[0].family_members.find(f => (f.mobile || '').replace(/\D/g, '') === loggedInMobile);
                if (fm && fm.profile_photo_url) authorPhoto = fm.profile_photo_url;
            }
        }

        const post = await portal.createPost({
            authorId: member.membership_no,
            textContent: text || null,
            images: imageUrls,
            location: member.village || null,
            authorName: member.name, // passes family member identity
            authorPhoto: authorPhoto,
            authorMobile: member.mobile
        });

        // Return enriched post
        const enriched = await portal.getPost(post.id, member.membership_no);

        // Notify connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('new_post', enriched);
        }

        res.status(201).json({
            success: true,
            message: 'Post published!',
            post: enriched
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
};

/**
 * GET /api/portal/posts
 * Get community feed (paginated)
 */
exports.getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        const posts = await portal.getPosts({
            page,
            limit,
            membershipNo: req.portalMember.membership_no,
            mobile: req.portalMember.mobile
        });

        // For each post, fetch comments
        for (const post of posts) {
            post.comments = await portal.getComments(post.id);
        }

        res.json({ success: true, posts });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ success: false, message: 'Failed to load posts' });
    }
};

/**
 * DELETE /api/portal/posts/:id
 * Delete a post (only by author)
 */
exports.deletePost = async (req, res) => {
    try {
        const deleted = await portal.deletePost(
            req.params.id,
            req.portalMember.membership_no
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or you are not the author'
            });
        }

        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

/**
 * PUT /api/portal/posts/:id
 * Edit a post (only by author)
 */
exports.editPost = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post content is required'
            });
        }

        const updated = await portal.editPost(
            req.params.id,
            req.portalMember.membership_no,
            text.trim()
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or you are not the author'
            });
        }

        res.json({ success: true, message: 'Post updated', post: updated });
    } catch (error) {
        console.error('Edit post error:', error);
        res.status(500).json({ success: false, message: 'Failed to update post' });
    }
};

/**
 * POST /api/portal/posts/:id/report
 * Report a post
 */
exports.reportPost = async (req, res) => {
    try {
        const { reason } = req.body;

        await portal.reportPost(
            req.params.id,
            req.portalMember.membership_no,
            reason || 'No reason provided'
        );

        res.json({ success: true, message: 'Post reported. Our team will review it.' });
    } catch (error) {
        console.error('Report post error:', error);
        res.status(500).json({ success: false, message: 'Failed to report post' });
    }
};


// ═══════════════════════════════════════════════════
//  LIKES
// ═══════════════════════════════════════════════════

/**
 * POST /api/portal/posts/:id/like
 * Toggle like on a post
 */
exports.toggleLike = async (req, res) => {
    try {
        const result = await portal.toggleLike(
            req.params.id,
            req.portalMember.membership_no,
            req.portalMember.mobile
        );

        // Notify connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('like_updated', {
                postId: req.params.id,
                likes: result.likes_count
            });
        }

        // Create notification for post author (only on like, not unlike)
        if (result.liked) {
            try {
                const post = await portal.getPost(req.params.id, req.portalMember.membership_no);
                if (post && post.author_id !== req.portalMember.membership_no) {
                    await portal.createNotification(
                        post.author_id,
                        'like',
                        req.portalMember.membership_no,
                        'liked your post',
                        parseInt(req.params.id),
                        req.portalMember.name,
                        post.author_mobile,
                        req.portalMember.mobile
                    );
                    if (io) {
                        const count = await portal.getUnreadNotificationCount(post.author_id, post.author_mobile);
                        io.to(`user:${post.author_id}-${post.author_mobile}`).emit('notification_count', { count });
                    }
                }
            } catch (notifErr) {
                console.error('Like notification error:', notifErr);
            }
        }

        res.json({
            success: true,
            liked: result.liked,
            likes_count: result.likes_count
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle like' });
    }
};


// ═══════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════

/**
 * POST /api/portal/posts/:id/comments
 * Add a comment to a post
 */
exports.addComment = async (req, res) => {
    try {
        const { text, parentId } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        // --- Banned Words Check ---
        const activeBannedWords = await pool.query('SELECT word FROM banned_words');
        if (activeBannedWords.rows.length > 0) {
            const lowerText = text.toLowerCase();
            const containsBannedWord = activeBannedWords.rows.some(r => lowerText.includes(r.word));
            if (containsBannedWord) {
                return res.status(403).json({ success: false, message: 'Your comment contains restricted vocabulary and cannot be published' });
            }
        }

        const member = req.portalMember;

        // Fetch current individual photo
        const profileRes = await pool.query('SELECT profile_photo_url, family_members, mobile FROM members WHERE membership_no = $1', [member.membership_no]);
        let authorPhoto = profileRes.rows[0]?.profile_photo_url;
        if (profileRes.rows[0]) {
            const headMobile = (profileRes.rows[0].mobile || '').replace(/\D/g, '');
            const loggedInMobile = (member.mobile || '').replace(/\D/g, '');
            if (loggedInMobile !== headMobile && Array.isArray(profileRes.rows[0].family_members)) {
                const fm = profileRes.rows[0].family_members.find(f => (f.mobile || '').replace(/\D/g, '') === loggedInMobile);
                if (fm && fm.profile_photo_url) authorPhoto = fm.profile_photo_url;
            }
        }

        const comment = await portal.addComment(
            req.params.id,
            member.membership_no,
            text.trim(),
            member.name,
            authorPhoto,
            member.mobile,
            parentId || null
        );

        // Notify connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('new_comment', {
                postId: req.params.id,
                comment
            });
        }

        // Create notification for post author
        try {
            const post = await portal.getPost(req.params.id, member.membership_no);
            if (post && post.author_id !== member.membership_no) {
                const preview = text.trim().substring(0, 50);
                await portal.createNotification(
                    post.author_id,
                    'comment',
                    member.membership_no,
                    `commented: "${preview}${text.trim().length > 50 ? '...' : ''}"`,
                    parseInt(req.params.id),
                    member.name,
                    post.author_mobile,
                    member.mobile
                );
                if (io) {
                    const count = await portal.getUnreadNotificationCount(post.author_id, post.author_mobile);
                    io.to(`user:${post.author_id}-${post.author_mobile}`).emit('notification_count', { count });
                }
            }
        } catch (notifErr) {
            console.error('Comment notification error:', notifErr);
        }

        res.status(201).json({ success: true, comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

/**
 * GET /api/portal/posts/:id/comments
 * Get comments for a post
 */
exports.getComments = async (req, res) => {
    try {
        const parentId = req.query.parentId || null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        const result = await portal.getComments(
            req.params.id,
            req.portalMember.membership_no,
            req.portalMember.mobile,
            parentId,
            page,
            limit
        );
        res.json({ success: true, comments: result.comments, total: result.total, page, limit });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch comments' });
    }
};

/**
 * POST /api/portal/comments/:id/like
 * Toggle like on a comment
 */
exports.toggleLikeComment = async (req, res) => {
    try {
        const result = await portal.toggleLikeComment(
            req.params.id,
            req.portalMember.membership_no,
            req.portalMember.mobile
        );

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('comment_like_updated', {
                commentId: req.params.id,
                likes: result.likes_count
            });
        }

        res.json({
            success: true,
            liked: result.liked,
            likes_count: result.likes_count
        });
    } catch (error) {
        console.error('Toggle comment like error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle comment like' });
    }
};

/**
 * DELETE /api/portal/comments/:id
 * Delete a comment (only by author)
 */
exports.deleteComment = async (req, res) => {
    try {
        const deleted = await portal.deleteComment(
            req.params.id,
            req.portalMember.membership_no
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found or you are not the author'
            });
        }

        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment' });
    }
};


// ═══════════════════════════════════════════════════
//  PHOTO GALLERY
// ═══════════════════════════════════════════════════

/**
 * POST /api/portal/photos
 * Upload photos to member's gallery
 */
exports.uploadPhotos = async (req, res) => {
    try {
        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const caption = req.body.caption || '';
        const photos = [];

        for (const file of files) {
            try {
                const url = await uploadFile(file);
                const photo = await portal.addPhoto(
                    req.portalMember.membership_no,
                    url,
                    caption || file.originalname.replace(/\.[^/.]+$/, '')
                );
                photos.push(photo);
            } catch (uploadErr) {
                console.error('Photo upload error:', uploadErr);
            }
        }

        if (photos.length === 0) {
            return res.status(500).json({ success: false, message: 'Failed to upload photos' });
        }

        res.status(201).json({
            success: true,
            message: `${photos.length} photo(s) uploaded!`,
            photos
        });
    } catch (error) {
        console.error('Upload photos error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload photos' });
    }
};

/**
 * GET /api/portal/photos
 * Get logged-in member's photos
 */
exports.getMyPhotos = async (req, res) => {
    try {
        const photos = await portal.getPhotos(req.portalMember.membership_no);
        res.json({ success: true, photos });
    } catch (error) {
        console.error('Get photos error:', error);
        res.status(500).json({ success: false, message: 'Failed to load photos' });
    }
};

/**
 * GET /api/portal/photos/:memberId
 * Get a specific member's photos
 */
exports.getMemberPhotos = async (req, res) => {
    try {
        const photos = await portal.getPhotos(req.params.memberId);
        res.json({ success: true, photos });
    } catch (error) {
        console.error('Get member photos error:', error);
        res.status(500).json({ success: false, message: 'Failed to load photos' });
    }
};

/**
 * DELETE /api/portal/photos/:id
 * Delete a photo (only by owner)
 */
exports.deletePhoto = async (req, res) => {
    try {
        const deleted = await portal.deletePhoto(
            req.params.id,
            req.portalMember.membership_no
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Photo not found or you are not the owner'
            });
        }

        res.json({ success: true, message: 'Photo deleted' });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete photo' });
    }
};


// ═══════════════════════════════════════════════════
//  SUBSCRIPTIONS (FOLLOW / UNFOLLOW)
// ═══════════════════════════════════════════════════

/**
 * POST /api/portal/subscribe/:memberId
 * Toggle follow/unfollow a member
 */
exports.toggleSubscription = async (req, res) => {
    try {
        const targetId = req.params.memberId;
        const targetMobile = req.params.mobile || ''; // Optional mobile for individual targeting
        const result = await portal.toggleSubscription(
            req.portalMember.membership_no,
            req.portalMember.mobile,
            targetId,
            targetMobile
        );

        // Create notification on follow
        if (result.subscribed) {
            try {
                await portal.createNotification(
                    targetId,
                    'follow',
                    req.portalMember.membership_no,
                    'started following you',
                    null,
                    req.portalMember.name,
                    targetMobile,
                    req.portalMember.mobile
                );
                const io = req.app.get('io');
                if (io) {
                    const count = await portal.getUnreadNotificationCount(targetId, targetMobile);
                    io.to(`user:${targetId}-${targetMobile}`).emit('notification_count', { count });
                }
            } catch (notifErr) {
                console.error('Follow notification error:', notifErr);
            }
        }

        res.json({
            success: true,
            subscribed: result.subscribed,
            message: result.subscribed ? 'Subscribed' : 'Unsubscribed'
        });
    } catch (error) {
        if (error.message === 'Cannot subscribe to yourself') {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Toggle subscription error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle subscription' });
    }
};

/**
 * GET /api/portal/subscriptions
 * Get members the logged-in user follows
 */
exports.getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await portal.getSubscriptions(
            req.portalMember.membership_no,
            req.portalMember.mobile
        );
        res.json({ success: true, subscriptions });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscriptions' });
    }
};

/**
 * GET /api/portal/members
 * Get all members with subscription status (paginated)
 */
exports.getMembers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 30), 100);
        const filters = {
            search: (req.query.search || '').trim(),
            district: (req.query.district || '').trim(),
            village: (req.query.village || '').trim(),
            gender: (req.query.gender || '').trim(),
            hasMobile: req.query.hasMobile === 'true',
        };

        const [members, total] = await Promise.all([
            portal.getMembersWithSubscription(
                req.portalMember.membership_no,
                req.portalMember.mobile,
                page, limit, filters
            ),
            portal.getMembersCount(req.portalMember.membership_no, filters),
        ]);

        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            members,
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
        });
    } catch (error) {
        console.error('Get portal members error:', error);
        res.status(500).json({ success: false, message: 'Failed to load members' });
    }
};

/**
 * GET /api/portal/members/filters
 * Returns distinct districts and their villages for filter dropdowns
 */
exports.getMemberFilterOptions = async (req, res) => {
    try {
        const districtMap = await portal.getMemberFilterOptions();
        res.json({ success: true, districts: districtMap });
    } catch (error) {
        console.error('Filter options error:', error);
        res.status(500).json({ success: false, message: 'Failed to load filter options' });
    }
};


/**
 * GET /api/portal/members/:id
 * Get a specific member profile by ID
 */
exports.getMemberById = async (req, res) => {
    try {
        const member = await portal.getMemberProfile(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, member });
    } catch (error) {
        console.error('Get member by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to load member profile' });
    }
};

/**
 * GET /api/portal/members/public/:id
 * Get a public, read-only profile by ID and Name
 */
exports.getPublicProfile = async (req, res) => {
    try {
        const membershipNo = req.params.id;
        const name = req.query.name;

        // Viewer can be undefined if not logged in, but our route will probably be authenticated
        const viewerNo = req.portalMember ? req.portalMember.membership_no : null;
        const viewerMobile = req.portalMember ? req.portalMember.mobile : null;

        const profileData = await portal.getPublicProfileData(membershipNo, name, viewerNo, viewerMobile);
        if (!profileData) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        res.json({ success: true, profile: profileData });
    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to load public profile' });
    }
};


// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════

/**
 * GET /api/portal/notifications
 * Get notifications for the logged-in member
 */
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await portal.getNotifications(
            req.portalMember.membership_no,
            req.portalMember.mobile
        );
        const unreadCount = await portal.getUnreadNotificationCount(
            req.portalMember.membership_no,
            req.portalMember.mobile
        );
        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to load notifications' });
    }
};

/**
 * PUT /api/portal/notifications/:id/read
 * Mark a single notification as read
 */
exports.markNotificationRead = async (req, res) => {
    try {
        const notif = await portal.markNotificationRead(
            req.params.id,
            req.portalMember.membership_no,
            req.portalMember.mobile
        );
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.json({ success: true, notification: notif });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
};

/**
 * DELETE /api/portal/notifications/:id
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        await portal.deleteNotification(req.params.id, req.portalMember.membership_no, req.portalMember.mobile);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};

/**
 * PUT /api/portal/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllNotificationsRead = async (req, res) => {
    try {
        await portal.markAllNotificationsRead(req.portalMember.membership_no, req.portalMember.mobile);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notifications' });
    }
};

/**
 * GET /api/portal/notifications/unread-count
 * Get count of unread notifications
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await portal.getUnreadNotificationCount(req.portalMember.membership_no, req.portalMember.mobile);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
};


// ═══════════════════════════════════════════════════
//  CHAT (REST endpoints for history/contacts)
// ═══════════════════════════════════════════════════

/**
 * GET /api/portal/chat/contacts
 * Get chat contacts with latest message
 */
exports.getChatContacts = async (req, res) => {
    try {
        const contacts = await portal.getChatContacts(req.portalMember.membership_no, req.portalMember.mobile);
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Get chat contacts error:', error);
        res.status(500).json({ success: false, message: 'Failed to load contacts' });
    }
};

/**
 * GET /api/portal/chat/conversation/:memberId
 * Get conversation history with a specific member
 */
exports.getConversation = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const messages = await portal.getConversation(
            req.portalMember.membership_no,
            req.portalMember.mobile,
            req.params.memberId,
            req.params.mobile || '',
            limit,
            offset
        );

        // Mark messages from the other person as read
        await portal.markMessagesRead(
            req.portalMember.membership_no,
            req.portalMember.mobile,
            req.params.memberId,
            req.params.mobile || ''
        );

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to load conversation' });
    }
};

/**
 * PUT /api/portal/chat/read/:memberId
 * Mark all messages from a member as read
 */
exports.markChatRead = async (req, res) => {
    try {
        await portal.markMessagesRead(
            req.portalMember.membership_no,
            req.portalMember.mobile,
            req.params.memberId,
            req.params.mobile || ''
        );
        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark chat read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
};

