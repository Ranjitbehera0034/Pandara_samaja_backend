const pool = require('./config/db');

async function migrate() {
    try {
        await pool.query('ALTER TABLE candidates ADD COLUMN IF NOT EXISTS manual_form TEXT;');
        console.log('Migration successful: manual_form column added/exists.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
