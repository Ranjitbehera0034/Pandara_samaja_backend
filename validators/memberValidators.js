const { z } = require('zod');

// Schema for adding or updating a member
const memberSchema = z.object({
    membership_no: z.string().max(10, 'Membership number cannot exceed 10 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
    head_gender: z.enum(['Male', 'Female', 'Other']).optional(),
    mobile: z.union([z.string(), z.number()]).optional().nullable()
        .transform(val => val ? String(val).replace(/\D/g, '') : val),
    male: z.union([z.number(), z.string().transform(Number)]).optional(),
    female: z.union([z.number(), z.string().transform(Number)]).optional(),
    district: z.string().max(50).optional(),
    taluka: z.string().max(50).optional(),
    panchayat: z.string().max(50).optional(),
    village: z.string().max(50).optional(),
    aadhar_no: z.union([z.string(), z.number()]).optional().nullable()
        .transform(val => val ? String(val).replace(/\D/g, '') : val),
    family_members: z.union([
        z.array(z.any()),
        z.string().transform((str) => {
            try { return JSON.parse(str); } catch { return []; }
        })
    ]).optional(),
    address: z.string().max(255).optional().nullable(),
    state: z.string().max(50).optional().nullable(),
    profile_photo_url: z.string().optional().nullable()
});

module.exports = {
    memberSchema
};
