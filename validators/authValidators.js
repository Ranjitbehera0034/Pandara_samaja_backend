// validators/authValidators.js — Zod schemas for admin auth endpoints
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'user', 'super_admin']).optional()
});

const mfaVerifySchema = z.object({
  code: z.string().length(6, 'MFA code must be exactly 6 digits').regex(/^\d{6}$/, 'MFA code must be numeric')
});

module.exports = { loginSchema, registerSchema, mfaVerifySchema };
