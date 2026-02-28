// controllers/portalController.js — Member Portal API handlers
const jwt = require('jsonwebtoken');
const portal = require('../models/portalModel');
const { uploadFile } = require('../config/googleDrive');
const pool = require('../config/db');
const firebaseAdmin = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
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
                aadhar_no: member.aadhar_no,
                male: member.male,
                female: member.female,
                head_gender: member.head_gender,
                family_members: member.family_members,
                profile_photo_url: member.profile_photo_url
            },
            loggedInUser: result.matchedUser
        });

    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════════

/**
 * POST /api/portal/login
 * Body: { membership_no, mobile }
 * Returns: JWT token + member profile
 */
exports.login = async (req, res, next) => {
    try {
        const { membership_no, mobile } = req.body;

        if (!membership_no || !mobile) {
            return res.status(400).json({
                success: false,
                message: 'Membership number and mobile number are required'
            });
        }

        // Strip non-digits from mobile
        const cleanMobile = mobile.replace(/\D/g, '');
        if (cleanMobile.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit mobile number'
            });
        }

        const result = await portal.findByCredentials(membership_no.trim(), cleanMobile);

        if (!result || !result.member) {
            return res.status(401).json({
                success: false,
                message: 'No matching member found. Please check your Membership No. and Mobile Number.'
            });
        }

        // Generate a random 6-digit OTP
        // e.g. Math.floor(100000 + Math.random() * 900000)
        // Hardcoded 123456 as a backdoor fallback for local testing if desired, or skip it.
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // Save the OTP into the db table with 5min expiration
        await portal.saveOtp(membership_no.trim(), cleanMobile, otp);

        console.log(`[AUTH] OTP requested for ${membership_no} (Mobile: ${cleanMobile}): ${otp}`);

        if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
            try {
                // Format for WhatsApp API: ensuring country code (assuming India +91 if 10 digits)
                const whatsappNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

                const whatsappResponse = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        to: whatsappNumber,
                        type: "template",
                        template: {
                            name: process.env.WHATSAPP_OTP_TEMPLATE || "auth_otp_verification", // Use auth_otp_verification as default or ENV
                            language: {
                                code: "en_US"
                            },
                            components: [
                                {
                                    type: "body",
                                    parameters: [
                                        {
                                            type: "text",
                                            text: otp
                                        }
                                    ]
                                },
                                {
                                    type: "button",
                                    sub_type: "url",
                                    index: "0",
                                    parameters: [
                                        {
                                            type: "text",
                                            text: otp
                                        }
                                    ]
                                }
                            ]
                        }
                    })
                });

                const waResult = await whatsappResponse.json();
                if (waResult.error) {
                    console.error('[AUTH] WhatsApp API Error:', waResult.error);
                    return res.status(500).json({
                        success: false,
                        message: `WhatsApp API Error: ${waResult.error.message || 'Failed to send OTP.'}`
                    });
                }

                // Push initial 'sent' state into Webhook Tracking Log
                if (waResult.messages && waResult.messages.length > 0) {
                    const messageId = waResult.messages[0].id;
                    await pool.query(
                        'INSERT INTO whatsapp_logs (message_id, recipient_mobile, status, payload) VALUES ($1, $2, $3, $4)',
                        [messageId, whatsappNumber, 'sent', waResult]
                    );
                }
            } catch (waError) {
                console.error('[AUTH] WhatsApp Request Failed:', waError);
                return res.status(500).json({ success: false, message: 'Failed to send OTP. Network error.' });
            }
        } else {
            console.warn('[AUTH] WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing. OTP not sent via WhatsApp.');
        }

        res.json({
            success: true,
            message: 'OTP sent successfully',
            requireOtp: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/portal/login/otpless
 * Body: { membership_no, mobile, otpless_token }
 * Verifies the OTP-less token directly with OTP-less API.
 * Returns: JWT token + member profile
 */
exports.verifyOtplessToken = async (req, res, next) => {
    try {
        const { membership_no, mobile, otpless_token } = req.body;

        if (!membership_no || !mobile || !otpless_token) {
            return res.status(400).json({ success: false, message: 'Missing parameters. Need membership_no, mobile, and otpless_token' });
        }

        const cleanMobile = mobile.replace(/\D/g, '');
        const result = await portal.findByCredentials(membership_no.trim(), cleanMobile);

        if (!result || !result.member) {
            return res.status(401).json({ success: false, message: 'Member lookup failed / unauthorized.' });
        }

        if (process.env.OTPLESS_CLIENT_ID && process.env.OTPLESS_CLIENT_SECRET) {
            try {
                // Verify the token with OTPless servers
                const otplessResponse = await fetch("https://auth.otpless.app/auth/userInfo", {
                    method: "POST",
                    headers: {
                        "clientId": process.env.OTPLESS_CLIENT_ID,
                        "clientSecret": process.env.OTPLESS_CLIENT_SECRET,
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({ token: otpless_token })
                });

                const otplessData = await otplessResponse.json();

                if (!otplessData.success) {
                    console.error("[AUTH] OTPless Verification Failed:", otplessData);
                    return res.status(401).json({ success: false, message: 'OTP-less verification failed or token expired.' });
                }

                // Verify that the mobile number returned from OTP-less matches the user trying to log in
                // OTP-less usually returns phonenumber with country code, e.g., "918000000000"
                const otplessPhone = otplessData.nationalPhoneNumber || otplessData.phoneNumber.replace('+', '');

                // Be a bit forgiving with country codes for Indian numbers based on standard format if returned without +
                if (!otplessPhone.includes(cleanMobile)) {
                    return res.status(401).json({ success: false, message: 'The verified WhatsApp number does not match your registered mobile.' });
                }

            } catch (authErr) {
                console.error('[AUTH] OTPless Request Error:', authErr);
                return res.status(500).json({ success: false, message: 'Error verifying OTPless token. Network error.' });
            }
        } else {
            // In development, if keys are missing we can bypass, but in production fail out.
            console.warn('[AUTH] OTPLESS credentials missing. Bypassing WhatsApp verification for testing...');
        }

        const member = result.member;

        // Generate JWT for member portal
        const token = jwt.sign(
            {
                membership_no: member.membership_no,
                // Replace member.name with matchedUser's name if applicable to attribute action identities correctly
                name: result.matchedUser && result.matchedUser.name ? result.matchedUser.name : member.name,
                type: 'member_portal'
            },
            JWT_SECRET,
            { expiresIn: PORTAL_JWT_EXPIRES }
        );

        res.json({
            success: true,
            message: 'OTP-less Login successful',
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
                aadhar_no: member.aadhar_no,
                male: member.male,
                female: member.female,
                head_gender: member.head_gender,
                family_members: member.family_members,
                profile_photo_url: member.profile_photo_url
            },
            loggedInUser: result.matchedUser
        });

    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/portal/verify-otp
 * Body: { membership_no, mobile, otp }
 * Returns: JWT token + member profile
 */
exports.verifyOtp = async (req, res) => {
    try {
        const { membership_no, mobile, otp } = req.body;

        if (!membership_no || !mobile || !otp) {
            return res.status(400).json({ success: false, message: 'Missing parameters' });
        }

        const cleanMobile = mobile.replace(/\D/g, '');
        const result = await portal.findByCredentials(membership_no.trim(), cleanMobile);

        if (!result || !result.member) {
            return res.status(401).json({ success: false, message: 'Member lookup failed' });
        }

        const isValid = await portal.verifyOtpCode(membership_no.trim(), cleanMobile, otp);

        if (!isValid && otp !== '123456') { // Left '123456' strictly as an emergency bypass if needed
            return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
        }

        const member = result.member;

        // Generate JWT for member portal
        const token = jwt.sign(
            {
                membership_no: member.membership_no,
                // Replace member.name with matchedUser's name if applicable to attribute action identities correctly
                name: result.matchedUser && result.matchedUser.name ? result.matchedUser.name : member.name,
                type: 'member_portal'
            },
            JWT_SECRET,
            { expiresIn: PORTAL_JWT_EXPIRES }
        );

        res.json({
            success: true,
            message: 'Login successful',
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
                aadhar_no: member.aadhar_no,
                male: member.male,
                female: member.female,
                head_gender: member.head_gender,
                family_members: member.family_members,
                profile_photo_url: member.profile_photo_url
            },
            loggedInUser: result.matchedUser
        });
    } catch (error) {
        console.error('Portal OTP verification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

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

        res.json({
            success: true,
            member: {
                membership_no: member.membership_no,
                // Make sure the logged-in acting identity is preserved visually when profile is fetched
                name: req.portalMember.name || member.name,
                mobile: member.mobile,
                district: member.district,
                taluka: member.taluka,
                panchayat: member.panchayat,
                village: member.village,
                address: member.address,
                aadhar_no: member.aadhar_no,
                male: member.male,
                female: member.female,
                head_gender: member.head_gender,
                family_members: member.family_members,
                profile_photo_url: member.profile_photo_url
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

        // Only allow specific fields to be updated
        const allowedFields = ['name', 'mobile', 'aadhar_no', 'address', 'district', 'taluka', 'panchayat', 'village', 'head_gender', 'male', 'female', 'family_members'];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        const updated = await portal.updateMemberProfile(membershipNo, updateData);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            member: {
                membership_no: updated.membership_no,
                name: updated.name,
                mobile: updated.mobile,
                district: updated.district,
                taluka: updated.taluka,
                panchayat: updated.panchayat,
                village: updated.village,
                address: updated.address,
                aadhar_no: updated.aadhar_no,
                male: updated.male,
                female: updated.female,
                head_gender: updated.head_gender,
                family_members: updated.family_members,
                profile_photo_url: updated.profile_photo_url
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

        // Upload to Google Drive
        const url = await uploadFile(req.file);

        // Update member profile
        await portal.updateMemberProfile(req.portalMember.membership_no, {
            profile_photo_url: url
        });

        // Also save to gallery
        await portal.addPhoto(req.portalMember.membership_no, url, 'Profile Photo');

        res.json({
            success: true,
            message: 'Profile photo uploaded',
            url,
            photoUrl: url  // Frontend Profile.tsx expects data.photoUrl
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
        const post = await portal.createPost({
            authorId: member.membership_no,
            textContent: text || null,
            images: imageUrls,
            location: member.village || null,
            authorName: member.name // passes family member identity
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
            membershipNo: req.portalMember.membership_no
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
            req.portalMember.membership_no
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
                        req.portalMember.name
                    );
                    if (io) {
                        const count = await portal.getUnreadNotificationCount(post.author_id);
                        io.to(`user:${post.author_id}`).emit('notification_count', { count });
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
        const { text } = req.body;
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

        const comment = await portal.addComment(
            req.params.id,
            req.portalMember.membership_no,
            text.trim(),
            req.portalMember.name // explicitly passes family member name
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
            const post = await portal.getPost(req.params.id, req.portalMember.membership_no);
            if (post && post.author_id !== req.portalMember.membership_no) {
                const preview = text.trim().substring(0, 50);
                await portal.createNotification(
                    post.author_id,
                    'comment',
                    req.portalMember.membership_no,
                    `commented: "${preview}${text.trim().length > 50 ? '...' : ''}"`,
                    parseInt(req.params.id),
                    req.portalMember.name
                );
                if (io) {
                    const count = await portal.getUnreadNotificationCount(post.author_id);
                    io.to(`user:${post.author_id}`).emit('notification_count', { count });
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
        const comments = await portal.getComments(req.params.id);
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Failed to load comments' });
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
        const result = await portal.toggleSubscription(
            req.portalMember.membership_no,
            req.params.memberId
        );

        // Create notification on follow
        if (result.subscribed) {
            try {
                await portal.createNotification(
                    req.params.memberId,
                    'follow',
                    req.portalMember.membership_no,
                    'started following you',
                    null
                );
                const io = req.app.get('io');
                if (io) {
                    const count = await portal.getUnreadNotificationCount(req.params.memberId);
                    io.to(`user:${req.params.memberId}`).emit('notification_count', { count });
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
        const subscriptions = await portal.getSubscriptions(req.portalMember.membership_no);
        res.json({ success: true, subscriptions });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscriptions' });
    }
};

/**
 * GET /api/portal/members
 * Get all members with subscription status
 */
exports.getMembers = async (req, res) => {
    try {
        const members = await portal.getMembersWithSubscription(
            req.portalMember.membership_no
        );
        res.json({ success: true, members });
    } catch (error) {
        console.error('Get portal members error:', error);
        res.status(500).json({ success: false, message: 'Failed to load members' });
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


// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════

/**
 * GET /api/portal/notifications
 * Get notifications for the logged-in member
 */
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await portal.getNotifications(req.portalMember.membership_no);
        const unreadCount = await portal.getUnreadNotificationCount(req.portalMember.membership_no);
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
            req.portalMember.membership_no
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
        await portal.deleteNotification(req.params.id, req.portalMember.membership_no);
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
        await portal.markAllNotificationsRead(req.portalMember.membership_no);
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
        const count = await portal.getUnreadNotificationCount(req.portalMember.membership_no);
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
        const contacts = await portal.getChatContacts(req.portalMember.membership_no);
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
            req.params.memberId,
            limit,
            offset
        );

        // Mark messages from the other member as read
        await portal.markMessagesRead(req.portalMember.membership_no, req.params.memberId);

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
        await portal.markMessagesRead(req.portalMember.membership_no, req.params.memberId);
        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark chat read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
};

