const jwt = require('jsonwebtoken');
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: allow EITHER an Admin Dashboard token OR a Member Portal token.
 * Sets:
 * - req.user (if admin)
 * - req.portalMember (if portal)
 * - req.anyUser = { id, type: 'admin'|'member', name }
 */
const requireAnyAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided.'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type === 'member_portal') {
            req.portalMember = {
                membership_no: decoded.membership_no,
                name: decoded.name,
                mobile: decoded.mobile,
                relation: decoded.relation
            };
            req.anyUser = {
                id: decoded.membership_no,
                type: 'member',
                name: decoded.name
            };
        } else {
            // Assume admin dashboard token (doesn't have 'type' usually, or has 'admin')
            req.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
            req.anyUser = {
                id: decoded.id,
                type: 'admin',
                name: decoded.username
            };
        }

        next();
    } catch (_err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};

module.exports = { requireAnyAuth };
