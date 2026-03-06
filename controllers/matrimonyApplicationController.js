// controllers/matrimonyApplicationController.js
// Handles member-facing and admin-facing matrimony form upload/verification

const ApplicationModel = require('../models/matrimonyApplicationModel');
const { uploadFile, FOLDER_MAP } = require('../config/googleDrive');
const pool = require('../config/db');

// ══════════════════════════════════════════════════
//  Helper: send in-app notification to all admins
// ══════════════════════════════════════════════════
const notifyAdmins = async (message, type = 'matrimony_form') => {
    try {
        // Get all admin users from the portal_notifications system.
        // Since admins are separate from portal members, we create a special
        // system notification for them — stored in a simple admin_notifications table.
        // If that table doesn't exist yet, we log and continue.
        await pool.query(
            `INSERT INTO admin_notifications (type, message, is_read, created_at)
             VALUES ($1, $2, false, CURRENT_TIMESTAMP)
             ON CONFLICT DO NOTHING`,
            [type, message]
        ).catch(() => { }); // Non-fatal if table doesn't exist yet
    } catch (err) {
        console.error('[MatrimonyApp] Failed to notify admins:', err.message);
    }
};

// ══════════════════════════════════════════════════
//  Helper: send in-app notification to a portal member
// ══════════════════════════════════════════════════
const notifyMember = async (memberId, memberMobile, actorId, actorName, message, type = 'matrimony') => {
    try {
        await pool.query(
            `INSERT INTO portal_notifications
             (recipient_id, recipient_mobile, actor_id, type, message, actor_name)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [memberId, memberMobile || null, actorId || 'system', type, message, actorName || 'Admin']
        );
    } catch (err) {
        console.error('[MatrimonyApp] Failed to notify member:', err.message);
    }
};


// ══════════════════════════════════════════════════
//  MEMBER ENDPOINTS
// ══════════════════════════════════════════════════

/**
 * POST /api/v1/portal/matrimony/submit
 * Member uploads their filled matrimony form (scan/photo).
 */
exports.submitForm = async (req, res) => {
    try {
        const member = req.portalMember; // injected by requirePortalAuth middleware
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded. Please select a form scan (JPG, PNG, or PDF).' });
        }

        // Validate file size (5 MB max)
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'File too large. Maximum allowed size is 5 MB.' });
        }

        const memberName = req.body.member_name || member.name;
        const relationToHof = member.relation || 'Self/Head';

        let form_file_url = null;
        if (req.file) {
            const fileUrl = await uploadFile(req.file, FOLDER_MAP.MATRIMONY_FORMS);
            form_file_url = fileUrl;
        } const mime = req.file.mimetype || '';
        const fileType = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : 'jpg';

        const result = await ApplicationModel.submitApplication({
            memberId: member.membership_no,
            membershipNo: member.membership_no,
            memberName,
            relationToHof,
            uploadedByName: member.name,
            uploadedByMobile: member.mobile,
            memberMobile: member.mobile,
            uploadedFileUrl: fileUrl,
            fileType,
        });

        if (result.error === 'duplicate') {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending submission. Please wait for admin review before submitting again.',
                status: result.existing.status,
            });
        }

        // Notify admins
        const notifMsg = `New matrimony form submitted by ${memberName} (${member.membership_no} · ${relationToHof}). Tap to review.`;
        await notifyAdmins(notifMsg);

        // Emit WebSocket event to admins (if io is available)
        const io = req.app.get('io');
        if (io) {
            io.emit('matrimony_form_submitted', {
                applicationId: result.application.id,
                memberName,
                membershipNo: member.membership_no,
                relation: relationToHof,
                isReupload: result.isReupload,
            });
        }

        res.status(201).json({
            success: true,
            message: result.isReupload
                ? `Re-upload successful! Version ${result.application.version} submitted for review.`
                : 'Your matrimony form has been submitted! We will review it and get back to you within 2-3 business days.',
            application: sanitizeForMember(result.application),
            isReupload: result.isReupload,
        });
    } catch (err) {
        console.error('[MatrimonyApp] submitForm error:', err);
        res.status(500).json({ success: false, message: 'Failed to submit form. Please try again.' });
    }
};

/**
 * GET /api/v1/portal/matrimony/my-application
 * Member checks the status of their own application.
 */
exports.getMyApplication = async (req, res) => {
    try {
        const member = req.portalMember;
        const application = await ApplicationModel.getApplicationForMember(member.membership_no, member.mobile);
        if (!application) {
            return res.json({ success: true, application: null });
        }
        res.json({ success: true, application: sanitizeForMember(application) });
    } catch (err) {
        console.error('[MatrimonyApp] getMyApplication error:', err);
        res.status(500).json({ success: false, message: 'Failed to load your application.' });
    }
};

/**
 * GET /api/v1/portal/matrimony/family-applications
 * HoF sees applications for all family members.
 */
exports.getFamilyApplications = async (req, res) => {
    try {
        const member = req.portalMember;
        const apps = await ApplicationModel.getApplicationsByMembership(member.membership_no);
        res.json({ success: true, applications: apps.map(sanitizeForMember) });
    } catch (err) {
        console.error('[MatrimonyApp] getFamilyApplications error:', err);
        res.status(500).json({ success: false, message: 'Failed to load family applications.' });
    }
};


// ══════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ══════════════════════════════════════════════════

/**
 * GET /api/v1/admin/matrimony-forms
 * Admin gets all form submissions (queue).
 */
exports.adminGetAll = async (req, res) => {
    try {
        const status = req.query.status || null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const apps = await ApplicationModel.getAllApplications({ status, page, limit });
        res.json({ success: true, applications: apps });
    } catch (err) {
        console.error('[MatrimonyApp] adminGetAll error:', err);
        res.status(500).json({ success: false, message: 'Failed to load applications.' });
    }
};

/**
 * GET /api/v1/admin/matrimony-forms/:id
 * Admin opens a specific application for review (includes member DB data).
 */
exports.adminGetOne = async (req, res) => {
    try {
        const app = await ApplicationModel.getApplicationById(req.params.id);
        if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });

        // Mark as under_review if it was pending
        if (app.status === 'pending') {
            const adminUser = req.user ? req.user.username : 'admin';
            await ApplicationModel.updateApplicationStatus(req.params.id, {
                status: 'under_review',
                reviewedBy: adminUser,
                adminRemarks: null,
                checklist: null,
            });
            app.status = 'under_review';
        }

        res.json({ success: true, application: app });
    } catch (err) {
        console.error('[MatrimonyApp] adminGetOne error:', err);
        res.status(500).json({ success: false, message: 'Failed to load application.' });
    }
};

/**
 * PUT /api/v1/admin/matrimony-forms/:id/review
 * Admin takes action: approve | reject | correction_needed
 * Body: { action: 'approve' | 'reject' | 'correction_needed', remarks: string, checklist: {} }
 */
exports.adminReview = async (req, res) => {
    try {
        const { action, remarks, checklist } = req.body;
        const adminUser = req.user ? req.user.username : 'admin';

        const validActions = ['approve', 'reject', 'correction_needed'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action. Use: approve | reject | correction_needed' });
        }

        // Map action to status
        const statusMap = {
            approve: 'approved',
            reject: 'rejected',
            correction_needed: 'correction_needed',
        };
        const newStatus = statusMap[action];

        // For reject/correction_needed, remarks are mandatory
        if (['reject', 'correction_needed'].includes(action) && !remarks) {
            return res.status(400).json({ success: false, message: 'Please provide a reason/remarks for this action.' });
        }

        const updated = await ApplicationModel.updateApplicationStatus(req.params.id, {
            status: newStatus,
            adminRemarks: remarks || null,
            reviewedBy: adminUser,
            checklist: checklist || null,
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }

        // Notify the member via portal notifications
        const memberMessages = {
            approved: '🎉 Great news! Your matrimony form has been approved. Your profile is now listed in the matrimony directory.',
            rejected: `❌ Your matrimony application could not be approved. Reason: ${remarks || 'Contact admin for details.'}`,
            correction_needed: `🔄 We need a correction on your matrimony form. Feedback: ${remarks}. Please re-upload after making the changes.`,
        };

        await notifyMember(
            updated.member_id,
            updated.member_mobile,
            'system',
            'Admin',
            memberMessages[action],
            'matrimony'
        );

        // If approved, optionally also create a candidate in the candidates table
        if (action === 'approve') {
            // Log admin action
            try {
                await pool.query(
                    `INSERT INTO admin_audit_logs (admin_username, action, target_type, target_id, details, ip_address)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [adminUser, 'APPROVE_MATRIMONY_FORM', 'MatrimonyApplication', String(updated.id),
                        JSON.stringify({ memberName: updated.member_name, membershipNo: updated.membership_no }),
                        req.ip || '0.0.0.0']
                );
            } catch (e) { /* non-fatal */ }
        }

        const io = req.app.get('io');
        if (io) {
            io.to(`user:${updated.member_id}-${updated.member_mobile}`).emit('matrimony_status_update', {
                applicationId: updated.id,
                status: newStatus,
                remarks: remarks || null,
            });
        }

        res.json({
            success: true,
            message: `Application ${action.replace('_', ' ')} successfully.`,
            application: updated,
        });
    } catch (err) {
        console.error('[MatrimonyApp] adminReview error:', err);
        res.status(500).json({ success: false, message: 'Failed to process review.' });
    }
};

/**
 * GET /api/v1/admin/matrimony-forms/stats
 * Returns counts by status for admin dashboard.
 */
exports.adminStats = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM matrimony_applications
             GROUP BY status`
        );
        const stats = {};
        for (const row of result.rows) {
            stats[row.status] = parseInt(row.count, 10);
        }
        res.json({ success: true, stats });
    } catch (err) {
        console.error('[MatrimonyApp] adminStats error:', err);
        res.status(500).json({ success: false, message: 'Failed to load stats.' });
    }
};


// ──────────────────────────────────────────────────
//  Utilities
// ──────────────────────────────────────────────────

/** Strip sensitive fields before sending to member. */
function sanitizeForMember(app) {
    const { reviewed_by, verification_checklist, ...rest } = app;
    return rest;
}
