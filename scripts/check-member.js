const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkMember() {
    try {
        const res = await pool.query(
            "SELECT membership_no, mobile, name FROM members WHERE membership_no = '123456789'"
        );
        console.log('Member found:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
checkMember();
