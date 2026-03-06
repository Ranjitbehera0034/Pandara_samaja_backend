// utils/auditLogger.js — Centralized audit logging for both admin and user actions
const pool = require('../config/db');

/**
 * Log user (member) activity.
 * @param {number|null} memberId  - Member primary key
 * @param {string}      memberName - Display name (used even if member is deleted)
 * @param {string}      action    - e.g. 'LOGIN', 'LIKE_POST', 'COMMENT_POST', 'SEND_MESSAGE', 'CREATE_POST'
 * @param {string|null} targetType - e.g. 'Post', 'Comment', 'Member'
 * @param {string|null} targetId   - ID of the targeted resource
 * @param {object}      details    - Extra context object (message snippet, post id, etc.)
 * @param {object}      req        - Express request (used for IP and User-Agent). Can be null for socket events.
 * @param {string|null} ipOverride - IP address when req is not available (e.g. WebSocket events)
 * @param {string|null} uaOverride - User-Agent when req is not available
 */
exports.logUserAction = async (
    memberId,
    memberName,
    action,
    targetType = null,
    targetId = null,
    details = {},
    req = null,
    ipOverride = null,
    uaOverride = null
) => {
    try {
        const ip = req
            ? (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '0.0.0.0')
            : (ipOverride || '0.0.0.0');

        const ua = req
            ? (req.headers['user-agent'] || null)
            : (uaOverride || null);

        await pool.query(
            `INSERT INTO user_audit_logs
        (member_id, member_name, action, target_type, target_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [memberId, memberName, action, targetType, targetId ? String(targetId) : null, JSON.stringify(details), ip, ua]
        );
    } catch (e) {
        // Non-blocking — never crash the main request because of a logging failure
        console.error('[auditLogger] Failed to write user audit log:', e.message);
    }
};
