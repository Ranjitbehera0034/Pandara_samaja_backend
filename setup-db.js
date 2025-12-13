const pool = require('./config/db');
const fs = require('fs');

async function setup() {
  try {
    console.log('Connecting to database...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Configured' : 'Not configured');

    console.log('Reading SQL file...');
    const sql = fs.readFileSync('./schema/users.sql', 'utf8');

    console.log('Creating users table...');
    await pool.query(sql);

    console.log('✅ Users table created successfully!');
    console.log('✅ Default admin user created (username: admin, password: admin123)');
    console.log('⚠️  Please change the default password after first login!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating users table:');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Full error:', err);
    await pool.end();
    process.exit(1);
  }
}

setup();
