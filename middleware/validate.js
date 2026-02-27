// middleware/validate.js — Generic Zod validation middleware
const { ZodError } = require('zod');

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 * On failure, responds with 400 and a list of field errors.
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};

module.exports = { validate };
