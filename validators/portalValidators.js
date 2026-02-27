const { z } = require('zod');

// Portal login request requires membership_no and mobile
const portalLoginSchema = z.object({
    membership_no: z.string().min(1, 'Membership number is required').transform(v => v.trim()),
    mobile: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 10, 'Mobile must be exactly 10 digits'),
});

// Portal OTP Verification request
const portalVerifyOtpSchema = z.object({
    membership_no: z.string().min(1, 'Membership number is required').transform(v => v.trim()),
    mobile: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 10, 'Mobile must be exactly 10 digits'),
    otp: z.string().min(1, 'OTP is required'),
});

// Portal OTP-less Verification request
const portalVerifyOtplessSchema = z.object({
    membership_no: z.string().min(1, 'Membership number is required').transform(v => v.trim()),
    mobile: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 10, 'Mobile must be exactly 10 digits'),
    otpless_token: z.string().min(1, 'OTP-less token is required'),
});

module.exports = {
    portalLoginSchema,
    portalVerifyOtpSchema,
    portalVerifyOtplessSchema,
};
