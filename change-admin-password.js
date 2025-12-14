#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function changeAdminPassword() {
    try {
        console.log('\n🔒 Admin Password Change Tool\n');
        console.log('This will change the password for the admin user.');
        console.log('Make sure to save the new password securely!\n');

        // Get new password
        const newPassword = await question('Enter new admin password (min 8 characters): ');

        if (!newPassword || newPassword.length < 8) {
            console.error('❌ Password must be at least 8 characters long');
            rl.close();
            process.exit(1);
        }

        // Confirm password
        const confirmPassword = await question('Confirm new password: ');

        if (newPassword !== confirmPassword) {
            console.error('❌ Passwords do not match');
            rl.close();
            process.exit(1);
        }

        console.log('\n🔄 Updating password...');

        // Hash the new password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username',
            [password_hash, 'admin']
        );

        if (result.rowCount === 0) {
            console.error('❌ Admin user not found in database');
            console.log('   Run: node setup-db.js to create the admin user first');
            rl.close();
            await pool.end();
            process.exit(1);
        }

        console.log('\n✅ Admin password updated successfully!');
        console.log('   Username: admin');
        console.log('   New password: [hidden for security]');
        console.log('\n⚠️  IMPORTANT: Save this password securely!');
        console.log('   You will need it to log in to the admin panel.\n');

        rl.close();
        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        await pool.end();
        process.exit(1);
    }
}

changeAdminPassword();
