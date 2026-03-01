-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'super_admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ⚠️  NO DEFAULT ADMIN IS SEEDED HERE.
-- To create the first super_admin account, run:
--   node scripts/create-first-admin.js
-- That script reads ADMIN_USERNAME and ADMIN_PASSWORD from environment variables
-- so credentials are never committed to source control.
