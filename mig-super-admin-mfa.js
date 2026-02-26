const pool = require('./config/db');

const up = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Altering users table constraint...');
        // Drop the constraint if it exists
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_name = 'users_role_check'
                    AND table_name = 'users'
                ) THEN
                    ALTER TABLE users DROP CONSTRAINT users_role_check;
                END IF;
            END
            $$;
        `);

        // Add MFA columns
        console.log('Adding MFA columns to users table...');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255)`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_mfa_active BOOLEAN DEFAULT false`);

        // Upgrade existing admin to super_admin
        await client.query(`UPDATE users SET role = 'super_admin' WHERE username = 'admin'`);

        // Create Admin Actions Queue
        console.log('Creating admin_actions_queue table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_actions_queue (
                id SERIAL PRIMARY KEY,
                admin_username VARCHAR(255),
                action_type VARCHAR(255),
                target_type VARCHAR(255),
                target_id VARCHAR(255),
                payload JSONB,
                status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewer_username VARCHAR(255),
                reviewed_at TIMESTAMP
            )
        `);

        await client.query('COMMIT');
        console.log('✅ Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
};

up();
