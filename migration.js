const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Adding membership_no column and real_name to users table...');
        // We'll also add 'real_name' to store the name from the members table for quick display
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_no VARCHAR(10)');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS real_name VARCHAR(100)');
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
