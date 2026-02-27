/**
 * Global Error Handler Middleware
 * Standardizes API error responses across the entire application.
 */
const errorHandler = (err, req, res, next) => {
    // Log error for debugging purposes (consider using Winston/Pino for serious prod logging)
    console.error(`[Error] ${err.name}: ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    // Default Error Status & Message
    let statusCode = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || null;

    // Handle known specific error types

    // 1. Zod Validation Errors (handled inside out validate.js usually, but caught here as fallback)
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Validation Error';
        errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    }

    // 2. JWT Authentication Errors
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Invalid or expired token. Please log in again.';
    }

    // 3. PostgreSQL Unique Constraint Violation
    else if (err.code === '23505') {
        statusCode = 409;
        message = 'Resource already exists (Constraint violation).';
        // Extract field name from constraint (e.g., "users_username_key" -> "username")
        if (err.constraint) {
            const match = err.constraint.match(/_(.+?)_key/);
            if (match) {
                errors = [{ field: match[1], message: `${match[1]} already exists.` }];
            }
        }
    }

    // Send final standardized JSON response
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
        // Only provide stack traces if we aren't safely in production
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
