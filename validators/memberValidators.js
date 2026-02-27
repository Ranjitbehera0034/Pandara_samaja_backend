const { z } = require('zod');

// Schema for adding or updating a member
const memberSchema = z.object({
    membership_no: z.string().max(10, 'Membership number cannot exceed 10 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
    head_gender: z.enum(['Male', 'Female', 'Other']).optional(),
    mobile: z.string()
        .transform(val => val ? val.replace(/\D/g, '') : val)
        .refine(val => !val || val.length === 10, 'Mobile must be exactly 10 digits if provided')
        .optional(),
    male: z.union([z.number(), z.string().transform(Number)]).optional(),
    female: z.union([z.number(), z.string().transform(Number)]).optional(),
    district: z.string().max(50).optional(),
    taluka: z.string().max(50).optional(),
    panchayat: z.string().max(50).optional(),
    village: z.string().max(50).optional(),
    aadhar_no: z.string()
        .transform(val => val ? val.replace(/\D/g, '') : val)
        .refine(val => !val || val.length === 12, 'Aadhaar must be exactly 12 digits if provided')
        .optional(),
    family_members: z.union([
        z.array(z.any()),
        z.string().transform((str) => {
            try { return JSON.parse(str); } catch { return []; }
        })
    ]).optional(),
    address: z.string().max(255).optional()
});

module.exports = {
    memberSchema
};
