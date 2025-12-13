const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function setup() {
  try {
    console.log('Connecting to database...');

    // Create users table
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create index
    console.log('Creating index on username...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);
    console.log('✅ Index created');

    // Hash the password
    console.log('Creating admin user...');
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin user
    await pool.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', passwordHash, 'admin']);

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Default credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('');
    console.log('⚠️  Please change the default password after first login!');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up database:');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    if (err.stack) {
      console.error('Stack trace:', err.stack);
    }
    await pool.end();
    process.exit(1);
  }
}

setup();
