const pool = require('./config/db');

const up = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating portal_reports table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS portal_reports (
                id SERIAL PRIMARY KEY,
                post_id INT REFERENCES portal_posts(id) ON DELETE CASCADE,
                reporter_id VARCHAR(50) REFERENCES members(membership_no) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, reporter_id)
            )
        `);

        await client.query('COMMIT');
        console.log('✅ reports db initialized!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
};

up();
