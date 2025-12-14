// Check if SMTP environment variables are configured
require('dotenv').config();

console.log('=== Email Configuration Check ===\n');

const requiredVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'ALERT_EMAIL_TO'
];

let allConfigured = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        if (varName === 'SMTP_PASS') {
            console.log(`✅ ${varName}: ${'*'.repeat(value.length)} (hidden)`);
        } else {
            console.log(`✅ ${varName}: ${value}`);
        }
    } else {
        console.log(`❌ ${varName}: NOT SET`);
        allConfigured = false;
    }
});

console.log('\n' + '='.repeat(50));

if (allConfigured) {
    console.log('✅ All email configuration is set!');
    console.log('\nYou can now test with:');
    console.log('  node test-login-notification.js');
} else {
    console.log('❌ Email configuration is incomplete!');
    console.log('\nPlease add the missing variables to your .env file:');
    console.log('\nSMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=nikhilaodishapandarasamaja@gmail.com');
    console.log('SMTP_PASS=your-gmail-app-password');
    console.log('ALERT_EMAIL_TO=nikhilaodishapandarasamaja@gmail.com');
    console.log('ALERT_EMAIL_FROM=nikhilaodishapandarasamaja@gmail.com');
    console.log('\nSee EMAIL_SECURITY_SETUP.md for detailed instructions.');
}

console.log('='.repeat(50) + '\n');
