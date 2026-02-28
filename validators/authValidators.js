const { z } = require('zod');

// Schema for adding an admin
const registerAdminSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters long').max(50),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.enum(['admin', 'super_admin']).optional(),
    membership_no: z.string().min(1, 'Membership Number is required'),
    real_name: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

// Schema for simple user login (Admin Dashboard)
const adminLoginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

module.exports = {
    registerAdminSchema,
    adminLoginSchema,
};
