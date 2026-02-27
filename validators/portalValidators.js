// validators/portalValidators.js — Zod schemas for portal endpoints
const { z } = require('zod');

const loginSchema = z.object({
  membership_no: z.string().min(1, 'Membership number is required').max(10).trim(),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits').max(15)
});

const verifyOtpSchema = z.object({
  membership_no: z.string().min(1, 'Membership number is required').max(10).trim(),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits').max(15),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric')
});

const createPostSchema = z.object({
  text: z.string().max(5000, 'Post text too long').optional()
});

const commentSchema = z.object({
  text: z.string().min(1, 'Comment text is required').max(2000, 'Comment too long').trim()
});

module.exports = { loginSchema, verifyOtpSchema, createPostSchema, commentSchema };
