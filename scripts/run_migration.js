/**
 * Run a SQL migration file against the database.
 * Usage: node scripts/run_migration.js <path-to-sql-file>
 * Example: node scripts/run_migration.js schema/add_head_gender.sql
 */
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Usage: node scripts/run_migration.js <path-to-sql-file>');
    process.exit(1);
}

const isProduction = process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('render.com') ||
    process.env.DATABASE_URL.includes('amazonaws.com') ||
    process.env.NODE_ENV === 'production'
);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
});

(async () => {
    try {
        const sql = fs.readFileSync(sqlFile, 'utf8');
        console.log(`⏳ Running migration: ${sqlFile}`);
        console.log('─'.repeat(50));
        console.log(sql);
        console.log('─'.repeat(50));

        await pool.query(sql);
        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
