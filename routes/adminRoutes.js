const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuthAdmin } = require('../middleware/auth');

// Apply admin authentication to all routes in this file
router.use(requireAuthAdmin);

// Content Moderation
router.get('/posts/reported', adminController.getReportedPosts);
router.get('/posts', adminController.getAllFeedPosts);
router.delete('/reports/:reportId/dismiss', adminController.dismissReport);
router.delete('/posts/:postId', adminController.deletePortalPost);
router.get('/stats', adminController.getDashboardStats);

// Broadcasts & Channels
router.post('/broadcast/whatsapp', adminController.broadcastWhatsapp);
router.post('/channel/post', adminController.postToChannel);

// Matrimony Admin
router.get('/candidates', adminController.getAllCandidates);
router.put('/candidates/:candidateId/status', adminController.updateCandidateStatus);
router.put('/candidates/:candidateId/match', adminController.markCandidateMatched);
router.delete('/candidates/:candidateId', adminController.deleteCandidate);

// Member Admin
router.get('/members/pending', adminController.getPendingMembers);
router.put('/members/:membershipNo/ban', adminController.banMember);
router.put('/members/:membershipNo/unban', adminController.unbanMember);
router.put('/members/:membershipNo/status', adminController.updateMemberStatus);

// Settings Admin
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

// Banned Words
router.get('/banned-words', adminController.getBannedWords);
router.post('/banned-words', adminController.addBannedWord);
router.delete('/banned-words/:id', adminController.deleteBannedWord);

// --- Super Admin specific routes ---
const { requireAuthSuperAdmin } = require('../middleware/auth');

// Audit Logs
router.get('/audit-logs', requireAuthSuperAdmin, adminController.getAuditLogs);
router.get('/user-audit-logs', requireAuthAdmin, adminController.getUserAuditLogs);

// Maker-Checker
router.get('/maker-checker', requireAuthSuperAdmin, adminController.getPendingActions);
router.post('/maker-checker/:id/review', requireAuthSuperAdmin, adminController.reviewAction);
router.post('/maker-checker/:id/undo', requireAuthSuperAdmin, adminController.undoAction);

// --- Matrimony Form Upload Verification (New Workflow) ---
const matrimonyAppCtrl = require('../controllers/matrimonyApplicationController');
router.get('/matrimony-forms/stats', matrimonyAppCtrl.adminStats);
router.get('/matrimony-forms', matrimonyAppCtrl.adminGetAll);
router.get('/matrimony-forms/:id', matrimonyAppCtrl.adminGetOne);
router.put('/matrimony-forms/:id/review', matrimonyAppCtrl.adminReview);

module.exports = router;
