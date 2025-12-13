const db = require('../config/db');

async function migrate() {
    try {
        console.log('🔄 Running migration: add match columns to candidates...');

        await db.query(`
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS is_matched BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS matched_partner_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS matched_partner_gender VARCHAR(50);
    `);

        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
