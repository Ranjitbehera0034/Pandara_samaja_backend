const pool = require('./config/db');

const up = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating admin_audit_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_logs (
                id SERIAL PRIMARY KEY,
                admin_username VARCHAR(255),
                action VARCHAR(255),
                target_type VARCHAR(255),
                target_id VARCHAR(255),
                details JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating global_settings table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_settings (
                setting_key VARCHAR(255) PRIMARY KEY,
                setting_value JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default settings
        await client.query(`
            INSERT INTO global_settings (setting_key, setting_value) 
            VALUES 
                ('features', '{"matrimony": true, "reels": true, "stories": true, "chat": true, "directory": true}'::jsonb),
                ('registration', '{"type": "open"}'::jsonb)
            ON CONFLICT (setting_key) DO NOTHING
        `);

        console.log('Creating banned_words table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS banned_words (
                id SERIAL PRIMARY KEY,
                word VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Altering members table...');
        await client.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP`);
        await client.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0`);
        await client.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false`);

        console.log('Altering candidates table...');
        await client.query(`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false`);
        await client.query(`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_unavailable BOOLEAN DEFAULT false`);
        await client.query(`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);

        console.log('Altering portal_posts table...');
        await client.query(`ALTER TABLE portal_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false`);
        await client.query(`ALTER TABLE portal_posts ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false`);

        console.log('Altering posts table...');
        await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published'`);
        await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP`);
        await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR(100)`);

        await client.query('COMMIT');
        console.log('✅ Database migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
};

up();
