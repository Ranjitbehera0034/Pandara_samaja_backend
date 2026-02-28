const { z } = require('zod');

// Portal Firebase Verification request
const portalVerifyFirebaseSchema = z.object({
    membership_no: z.string().min(1, 'Membership number is required').transform(v => v.trim()),
    mobile: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 10, 'Mobile must be exactly 10 digits'),
    idToken: z.string().min(1, 'Firebase ID token is required'),
});

module.exports = {
    portalVerifyFirebaseSchema,
};
