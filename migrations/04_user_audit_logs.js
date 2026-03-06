// migrations/04_user_audit_logs.js — Creates the user_audit_logs table
const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_audit_logs (
        id            SERIAL PRIMARY KEY,
        member_id     INTEGER,  -- Soft FK to members — no constraint to avoid schema dependency issues
        member_name   VARCHAR(120),
        action        VARCHAR(60) NOT NULL,
        target_type   VARCHAR(60),
        target_id     VARCHAR(60),
        details       JSONB,
        ip_address    VARCHAR(60),
        user_agent    TEXT,
        created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ual_member_id  ON user_audit_logs(member_id);
      CREATE INDEX IF NOT EXISTS idx_ual_action     ON user_audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_ual_created_at ON user_audit_logs(created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('✅  Migration 04_user_audit_logs: table and indexes created successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌  Migration 04_user_audit_logs failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
