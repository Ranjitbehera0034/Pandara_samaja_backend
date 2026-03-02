// routes/portalRoutes.js — Member Portal API routes
const express = require('express');
const router = express.Router();
const portalCtrl = require('../controllers/portalController');
const { requirePortalAuth } = require('../middleware/portalAuth');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { portalVerifyFirebaseSchema } = require('../validators/portalValidators');

// Specific rate limit for login attempts to prevent brute force/OTP enumeration
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per window
    message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

/**
 * Factory function — receives multer instance from app.js
 */
module.exports = (upload) => {

    // ── Public routes (no auth) ──
    // Firebase verify token route
    router.post('/login/firebase', loginRateLimiter, validate({ body: portalVerifyFirebaseSchema }), portalCtrl.loginWithFirebase);

    // ── Protected routes (require member portal JWT) ──

    // Profile
    router.get('/me', requirePortalAuth, portalCtrl.getProfile);
    router.put('/profile', requirePortalAuth, portalCtrl.updateProfile);
    router.post('/profile/photo', requirePortalAuth, upload.single('photo'), portalCtrl.uploadProfilePhoto);
    router.delete('/profile/photo', requirePortalAuth, portalCtrl.deleteProfilePhoto);

    // Profile — alias routes (frontend compatibility)
    // Profile.tsx calls PUT /api/portal/members/:id and POST /api/portal/members/:id/photo
    router.put('/members/:id', requirePortalAuth, portalCtrl.updateProfile);
    router.post('/members/:id/photo', requirePortalAuth, upload.single('photo'), portalCtrl.uploadProfilePhoto);
    router.delete('/members/:id/photo', requirePortalAuth, portalCtrl.deleteProfilePhoto);

    // Initialize apicache for high-volume read endpoints
    const apicache = require('apicache');
    const cache = apicache.middleware;

    // Community Posts (Feed)
    // Cache feed posts for 1 minute
    router.get('/posts', requirePortalAuth, cache('1 minute'), portalCtrl.getPosts);
    router.post('/posts', requirePortalAuth, upload.array('images', 10), portalCtrl.createPost);
    router.put('/posts/:id', requirePortalAuth, portalCtrl.editPost);
    router.delete('/posts/:id', requirePortalAuth, portalCtrl.deletePost);
    router.post('/posts/:id/report', requirePortalAuth, portalCtrl.reportPost);

    // Likes
    router.post('/posts/:id/like', requirePortalAuth, portalCtrl.toggleLike);

    // Comments
    router.get('/posts/:id/comments', requirePortalAuth, portalCtrl.getComments);
    router.post('/posts/:id/comments', requirePortalAuth, portalCtrl.addComment);
    router.delete('/comments/:id', requirePortalAuth, portalCtrl.deleteComment);

    // Photo Gallery
    router.get('/photos', requirePortalAuth, portalCtrl.getMyPhotos);
    router.get('/photos/:memberId', requirePortalAuth, portalCtrl.getMemberPhotos);
    router.post('/photos', requirePortalAuth, upload.array('photos', 10), portalCtrl.uploadPhotos);
    router.delete('/photos/:id', requirePortalAuth, portalCtrl.deletePhoto);

    // Subscriptions (Follow / Unfollow)
    router.post('/subscribe/:memberId{/:mobile}', requirePortalAuth, portalCtrl.toggleSubscription);
    router.get('/subscriptions', requirePortalAuth, portalCtrl.getSubscriptions);

    // Members directory — no cache, results depend on search/filter query params
    router.get('/members/filters', requirePortalAuth, cache('30 minutes'), portalCtrl.getMemberFilterOptions);
    router.get('/members', requirePortalAuth, portalCtrl.getMembers);
    router.get('/members/public/:id', requirePortalAuth, portalCtrl.getPublicProfile);
    router.get('/members/:id', requirePortalAuth, portalCtrl.getMemberById);

    // Notifications
    router.get('/notifications', requirePortalAuth, portalCtrl.getNotifications);
    router.get('/notifications/unread-count', requirePortalAuth, portalCtrl.getUnreadCount);
    router.put('/notifications/read-all', requirePortalAuth, portalCtrl.markAllNotificationsRead);
    router.put('/notifications/:id/read', requirePortalAuth, portalCtrl.markNotificationRead);
    router.delete('/notifications/:id', requirePortalAuth, portalCtrl.deleteNotification);

    // Chat (REST endpoints for history)
    router.get('/chat/contacts', requirePortalAuth, portalCtrl.getChatContacts);
    router.get('/chat/conversation/:memberId{/:mobile}', requirePortalAuth, portalCtrl.getConversation);
    router.put('/chat/read/:memberId{/:mobile}', requirePortalAuth, portalCtrl.markChatRead);

    // ── Family Hub Routes (Phase 6) ──
    const familyCtrl = require('../controllers/familyController');
    router.get('/family/albums', requirePortalAuth, familyCtrl.getAlbums);
    router.post('/family/albums', requirePortalAuth, upload.single('cover'), familyCtrl.createAlbum);
    router.delete('/family/albums/:id', requirePortalAuth, familyCtrl.deleteAlbum);
    router.post('/family/albums/:id/photos', requirePortalAuth, upload.array('photos', 20), familyCtrl.uploadPhotosToAlbum);

    router.get('/family/events', requirePortalAuth, familyCtrl.getEvents);
    router.post('/family/events', requirePortalAuth, familyCtrl.createEvent);
    router.delete('/family/events/:id', requirePortalAuth, familyCtrl.deleteEvent);
    router.post('/family/events/:id/rsvp', requirePortalAuth, familyCtrl.rsvpEvent);

    router.get('/family/accounts', requirePortalAuth, familyCtrl.getAccounts);
    router.post('/family/accounts', requirePortalAuth, familyCtrl.createAccount);
    router.put('/family/accounts/:accountId/status', requirePortalAuth, familyCtrl.updateAccountStatus);
    router.delete('/family/accounts/:accountId', requirePortalAuth, familyCtrl.deleteAccount);

    // ── Community Routes (Phases 4 & 5) ──
    const communityCtrl = require('../controllers/communityController');
    router.get('/events', requirePortalAuth, communityCtrl.getEvents);
    router.post('/events', requirePortalAuth, upload.single('image'), communityCtrl.createEvent);
    router.post('/events/:id/register', requirePortalAuth, communityCtrl.registerEvent);

    router.get('/groups', requirePortalAuth, communityCtrl.getGroups);
    router.post('/groups', requirePortalAuth, communityCtrl.createGroup);
    router.post('/groups/:groupId/join', requirePortalAuth, communityCtrl.joinGroup);

    router.get('/explore/stats', requirePortalAuth, communityCtrl.getExploreStats);

    // ── Advanced Features ──
    router.get('/live/streams', requirePortalAuth, communityCtrl.getLiveStreams);

    return router;
};
