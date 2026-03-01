const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    const sqlFile = path.join(__dirname, '../schema/portal_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    try {
        console.log('Running portal migration...');
        await pool.query(sql);
        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

runMigration();
