/**
 * scripts/create-first-admin.js
 *
 * One-time script to bootstrap the first super_admin account.
 * Run ONLY if the users table is empty (i.e., fresh deployment).
 *
 * Usage:
 *   ADMIN_USERNAME=ranjit ADMIN_PASSWORD=<strong-password> node scripts/create-first-admin.js
 *
 * Or set these in your .env file and run:
 *   node scripts/create-first-admin.js
 *
 * This script intentionally does NOT fall back to any default credentials.
 * It will refuse to run if ADMIN_PASSWORD is less than 12 characters.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment.');
    console.error('Example: ADMIN_USERNAME=ranjit ADMIN_PASSWORD=<strong-password> node scripts/create-first-admin.js');
    process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 12 characters long.');
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
}

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

    try {
        // Check if any users already exist
        const { rows: existing } = await pool.query('SELECT id FROM users LIMIT 1');
        if (existing.length > 0) {
            console.warn('WARNING: Users already exist in the database.');
            console.warn('This script is intended for first-time setup only.');
            console.warn('Use the Admin Panel to manage additional accounts.');
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(ADMIN_PASSWORD, salt);

        const { rows } = await pool.query(
            `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'super_admin')
       RETURNING id, username, role, created_at`,
            [ADMIN_USERNAME, password_hash]
        );

        console.log('✅ Super admin created successfully:');
        console.log(`   ID:       ${rows[0].id}`);
        console.log(`   Username: ${rows[0].username}`);
        console.log(`   Role:     ${rows[0].role}`);
        console.log(`   Created:  ${rows[0].created_at}`);
        console.log('');
        console.log('⚠️  You must now set up MFA. Log in to the admin panel to complete MFA setup.');
    } catch (err) {
        console.error('ERROR creating admin:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
