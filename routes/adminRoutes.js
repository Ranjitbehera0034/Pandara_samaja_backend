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

// Matrimony Admin
router.get('/candidates', adminController.getAllCandidates);
router.put('/candidates/:candidateId/status', adminController.updateCandidateStatus);
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

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
