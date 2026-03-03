const pool = require('./config/db');

async function migrate() {
    console.log('Starting migration for comment likes and replies...');
    try {
        await pool.query('BEGIN');

        // 1. Add parent_id to portal_comments
        await pool.query(`
            ALTER TABLE portal_comments 
            ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES portal_comments(id) ON DELETE CASCADE;
        `);
        console.log('Added parent_id to portal_comments.');

        // 2. Add likes_count to portal_comments
        await pool.query(`
            ALTER TABLE portal_comments 
            ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
        `);
        console.log('Added likes_count to portal_comments.');

        // 3. Create portal_comment_likes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS portal_comment_likes (
                id SERIAL PRIMARY KEY,
                comment_id INTEGER REFERENCES portal_comments(id) ON DELETE CASCADE,
                member_id VARCHAR(50) NOT NULL,
                member_mobile VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(comment_id, member_id, member_mobile)
            );
        `);
        console.log('Created portal_comment_likes table.');

        await pool.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        pool.end();
    }
}

migrate();
