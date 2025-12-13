const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function resetAdminPassword() {
    try {
        console.log('Resetting admin password...');

        // Hash the password 'admin123'
        const password = 'admin123';
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        console.log('Generated hash:', password_hash);

        // Update or insert admin user
        const result = await pool.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) 
      DO UPDATE SET password_hash = $2, role = $3
      RETURNING id, username, role
    `, ['admin', password_hash, 'admin']);

        console.log('✅ Admin user updated:', result.rows[0]);
        console.log('✅ Username: admin');
        console.log('✅ Password: admin123');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
}

resetAdminPassword();
