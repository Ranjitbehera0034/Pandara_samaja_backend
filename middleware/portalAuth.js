// middleware/portalAuth.js — JWT middleware for the Member Portal
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: require a valid member-portal JWT.
 * Sets req.portalMember = { membership_no, name }
 */
const requirePortalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Please login first.'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        // Ensure this is a member-portal token
        if (decoded.type !== 'member_portal') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        req.portalMember = {
            membership_no: decoded.membership_no,
            name: decoded.name,
            mobile: decoded.mobile,
            relation: decoded.relation
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please login again.'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Optional portal auth — attaches req.portalMember if token present, but does not reject.
 */
const optionalPortalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.type === 'member_portal') {
                req.portalMember = {
                    membership_no: decoded.membership_no,
                    name: decoded.name
                };
            }
        }
    } catch (_ignore) {
        // optional — ignore errors
    }
    next();
};

module.exports = { requirePortalAuth, optionalPortalAuth };
