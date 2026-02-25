const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'members'"
        );
        console.log('Columns:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
check();
