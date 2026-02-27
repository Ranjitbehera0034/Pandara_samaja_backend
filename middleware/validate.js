const { ZodError } = require('zod');

/**
 * Middleware to validate request body, query, or params against a Zod schema.
 * @param {object} schema - An object containing Zod schemas (e.g., { body: mySchema })
 */
const validate = (schema) => (req, res, next) => {
    try {
        if (schema.body) {
            req.body = schema.body.parse(req.body);
        }
        if (schema.query) {
            req.query = schema.query.parse(req.query);
        }
        if (schema.params) {
            req.params = schema.params.parse(req.params);
        }
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errorList = error.errors || error.issues || [];
            const errors = errorList.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            return res.status(400).json({
                success: false,
                message: 'Invalid request data',
                errors
            });
        }
        next(error);
    }
};

module.exports = validate;
