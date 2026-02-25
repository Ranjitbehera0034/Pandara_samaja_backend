const pool = require('../config/db');
const settingsModel = require('../models/settingsModel');

// Helper component for Audit Logging
const logAdminAction = async (req, action, targetType, targetId, details = {}) => {
    try {
        const adminUsername = req.user ? req.user.username : 'system';
        const ipAddress = req.ip || req.connection.remoteAddress;

        await pool.query(
            'INSERT INTO admin_audit_logs (admin_username, action, target_type, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminUsername, action, targetType, targetId, JSON.stringify(details), ipAddress]
        );
    } catch (e) {
        console.error('Failed to write audit log:', e);
    }
};

// Get all reported portal posts
exports.getReportedPosts = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id AS report_id,
                r.post_id,
                r.reason,
                r.created_at AS report_date,
                m.name AS reporter_name,
                m.membership_no AS reporter_membership_no,
                p.text_content,
                p.images,
                p.created_at AS post_date,
                a.name AS author_name,
                a.membership_no AS author_membership_no,
                a.profile_photo_url AS author_photo
            FROM portal_reports r
            JOIN members m ON m.membership_no = r.reporter_id
            JOIN portal_posts p ON p.id = r.post_id
            JOIN members a ON a.membership_no = p.author_id
            ORDER BY r.created_at ASC
        `;
        const result = await pool.query(query);
        res.json({ success: true, reports: result.rows });
    } catch (error) {
        console.error('Error fetching reported posts:', error);
        res.status(500).json({ success: false, message: 'Server error fetching reports' });
    }
};

// Dismiss a report without deleting post
exports.dismissReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        await pool.query('DELETE FROM portal_reports WHERE id = $1', [reportId]);
        res.json({ success: true, message: 'Report dismissed successfully' });
    } catch (error) {
        console.error('Error dismissing report:', error);
        res.status(500).json({ success: false, message: 'Failed to dismiss report' });
    }
};

// Delete a portal post (as admin) and clear its reports
exports.deletePortalPost = async (req, res) => {
    try {
        const { postId } = req.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete reports for this post
            await client.query('DELETE FROM portal_reports WHERE post_id = $1', [postId]);

            // Delete comments for this post
            await client.query('DELETE FROM portal_comments WHERE post_id = $1', [postId]);

            // Delete likes for this post
            await client.query('DELETE FROM portal_likes WHERE post_id = $1', [postId]);

            // Delete post
            await client.query('DELETE FROM portal_posts WHERE id = $1', [postId]);

            await client.query('COMMIT');

            res.json({ success: true, message: 'Post deleted successfully' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

// Get all feed posts for moderation
exports.getAllFeedPosts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        const query = `
            SELECT p.*,
                m.name AS author_name,
                m.profile_photo_url AS author_photo,
                (SELECT COUNT(*) FROM portal_reports r WHERE r.post_id = p.id) as report_count
            FROM portal_posts p
            JOIN members m ON m.membership_no = p.author_id
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await pool.query(query, [limit, offset]);

        // Also get total count
        const countQuery = `SELECT COUNT(*) FROM portal_posts`;
        const countResult = await pool.query(countQuery);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            posts: result.rows,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching feed posts:', error);
        res.status(500).json({ success: false, message: 'Server error fetching feed posts' });
    }
};

// Get Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = {};

        // Members count
        const membersReq = await pool.query('SELECT COUNT(*) FROM members');
        stats.totalMembers = parseInt(membersReq.rows[0].count);

        // Active members today (based on last_portal_login if we tracked it properly, or just mock it relative to total for now/use real data)
        const activeMembersReq = await pool.query("SELECT COUNT(*) FROM members WHERE last_portal_login >= CURRENT_DATE");
        stats.activeToday = parseInt(activeMembersReq.rows[0].count);

        // Total posts today
        const postsReq = await pool.query("SELECT COUNT(*) FROM portal_posts WHERE created_at >= CURRENT_DATE");
        stats.postsToday = parseInt(postsReq.rows[0].count);

        // Matrimony pending
        const matrimonyReq = await pool.query("SELECT COUNT(*) FROM candidates WHERE status = 'pending'");
        stats.matrimonyPending = parseInt(matrimonyReq.rows[0].count);

        // Moderation queue
        const reportsReq = await pool.query("SELECT COUNT(*) FROM portal_reports");
        stats.reportsPending = parseInt(reportsReq.rows[0].count);

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};

// --- Matrimony Approvals ---

// Get all candidates (including pending)
exports.getAllCandidates = async (req, res) => {
    try {
        const query = `
            SELECT * FROM candidates 
            ORDER BY 
                CASE WHEN status = 'pending' THEN 1 ELSE 2 END,
                created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, candidates: result.rows });
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ success: false, message: 'Server error fetching candidates' });
    }
};

// Update candidate status
exports.updateCandidateStatus = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { status } = req.body;

        if (!['approved', 'pending', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const result = await pool.query(
            'UPDATE candidates SET status = $1 WHERE id = $2 RETURNING *',
            [status, candidateId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }

        res.json({ success: true, candidate: result.rows[0], message: `Candidate ${status}` });
    } catch (error) {
        console.error('Error updating candidate status:', error);
        res.status(500).json({ success: false, message: 'Failed to update candidate status' });
    }
};

// Delete a candidate profile completely
exports.deleteCandidate = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const result = await pool.query('DELETE FROM candidates WHERE id = $1', [candidateId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }

        res.json({ success: true, message: 'Candidate deleted successfully' });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ success: false, message: 'Failed to delete candidate' });
    }
};

// --- Member Moderation ---

// Ban a member
exports.banMember = async (req, res) => {
    try {
        const { membershipNo } = req.params;
        const { reason } = req.body;

        const result = await pool.query(
            'UPDATE members SET is_banned = true, ban_reason = $1 WHERE membership_no = $2 RETURNING *',
            [reason, membershipNo]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, member: result.rows[0], message: 'Member banned successfully' });
    } catch (error) {
        console.error('Error banning member:', error);
        res.status(500).json({ success: false, message: 'Failed to ban member' });
    }
};

// Unban a member
exports.unbanMember = async (req, res) => {
    try {
        const { membershipNo } = req.params;

        const result = await pool.query(
            'UPDATE members SET is_banned = false, ban_reason = NULL WHERE membership_no = $1 RETURNING *',
            [membershipNo]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, member: result.rows[0], message: 'Member unbanned successfully' });
    } catch (error) {
        console.error('Error unbanning member:', error);
        res.status(500).json({ success: false, message: 'Failed to unban member' });
    }
};

// Update member status
exports.updateMemberStatus = async (req, res) => {
    try {
        const { membershipNo } = req.params;
        const { status } = req.body;

        if (!['approved', 'pending', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const result = await pool.query(
            'UPDATE members SET status = $1 WHERE membership_no = $2 RETURNING *',
            [status, membershipNo]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        await logAdminAction(req, 'UPDATE_MEMBER_STATUS', 'Member', membershipNo, { status });
        res.json({ success: true, member: result.rows[0], message: `Member ${status} successfully` });
    } catch (error) {
        console.error('Error updating member status:', error);
        res.status(500).json({ success: false, message: 'Failed to update member status' });
    }
};

// --- Settings Management ---
exports.getSettings = async (req, res) => {
    try {
        const settings = await settingsModel.getAllSettings();
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

exports.updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const updated = await settingsModel.updateSetting(key, value);
        await logAdminAction(req, 'UPDATE_SETTING', 'GlobalSetting', key, { newValue: value });

        res.json({ success: true, setting: updated, message: 'Setting updated successfully' });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ success: false, message: 'Failed to update setting' });
    }
};

// --- Audit Log Management ---
exports.getAuditLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            'SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        const countResult = await pool.query('SELECT COUNT(*) FROM admin_audit_logs');
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            logs: result.rows,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
};

// --- Banned Words Management ---
exports.getBannedWords = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM banned_words ORDER BY created_at DESC');
        res.json({ success: true, words: result.rows });
    } catch (error) {
        console.error('Error fetching banned words:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch banned words' });
    }
};

exports.addBannedWord = async (req, res) => {
    try {
        const { word } = req.body;
        if (!word || !word.trim()) {
            return res.status(400).json({ success: false, message: 'Word is required' });
        }

        const normalizedWord = word.trim().toLowerCase();

        const result = await pool.query(
            'INSERT INTO banned_words (word) VALUES ($1) ON CONFLICT (word) DO NOTHING RETURNING *',
            [normalizedWord]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Word is already banned' });
        }

        await logAdminAction(req, 'ADD_BANNED_WORD', 'BannedWord', result.rows[0].id, { word: normalizedWord });

        res.status(201).json({ success: true, word: result.rows[0], message: 'Banned word added' });
    } catch (error) {
        console.error('Error adding banned word:', error);
        res.status(500).json({ success: false, message: 'Failed to add banned word' });
    }
};

exports.deleteBannedWord = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM banned_words WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Banned word not found' });
        }

        await logAdminAction(req, 'DELETE_BANNED_WORD', 'BannedWord', id, { word: result.rows[0].word });

        res.json({ success: true, message: 'Banned word removed' });
    } catch (error) {
        console.error('Error deleting banned word:', error);
        res.status(500).json({ success: false, message: 'Failed to remove banned word' });
    }
};

// --- Pending Registrations ---
exports.getPendingMembers = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM members WHERE status = $1 ORDER BY created_at DESC', ['pending']);
        res.json({ success: true, members: result.rows });
    } catch (error) {
        console.error('Error fetching pending members:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending members' });
    }
};
