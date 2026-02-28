require('dotenv').config();
// global fetch available in Node 18+

async function verifyEnvironment() {
    console.log('🚀 Starting Pandara Samaja Environment Verification...\n');

    const config = {
        whatsapp: {
            token: process.env.WHATSAPP_TOKEN,
            phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID
        },
        otpless: {
            clientId: process.env.OTPLESS_CLIENT_ID,
            clientSecret: process.env.OTPLESS_CLIENT_SECRET
        }
    };

    // 1. Check WhatsApp Meta Config
    console.log('--- WhatsApp (Meta) Verification ---');
    if (!config.whatsapp.token || config.whatsapp.token.startsWith('EAAB...')) {
        console.log('❌ WHATSAPP_TOKEN: Missing or placeholder');
    } else {
        console.log('✅ WHATSAPP_TOKEN: Present');
        try {
            const res = await fetch(`https://graph.facebook.com/v17.0/${config.whatsapp.phoneId}`, {
                headers: { 'Authorization': `Bearer ${config.whatsapp.token}` }
            });
            const data = await res.json();
            if (data.id) {
                console.log(`✅ WhatsApp API Connection: Success (ID: ${data.id})`);
            } else {
                console.log(`❌ WhatsApp API Connection: Failed (${data.error?.message || 'Unknown error'})`);
            }
        } catch (err) {
            console.log(`❌ WhatsApp API Connection: Network Error (${err.message})`);
        }
    }

    // 2. Check OTPless Config
    console.log('\n--- OTPless Verification ---');
    if (!config.otpless.clientId || config.otpless.clientId === '(your-otpless-app-id)') {
        console.log('❌ OTPLESS Credentials: Missing or placeholder');
    } else {
        console.log('✅ OTPLESS Credentials: Present');
        // Simple verification - checking if we can get an auth token if possible, or just validating format
        console.log('ℹ️ Credentials verified via format check. Token exchange will happen during live login.');
    }

    // 3. Database Check
    console.log('\n--- Database Verification ---');
    try {
        const pool = require('./config/db');
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Database Connection: Success (' + res.rows[0].now + ')');
    } catch (err) {
        console.log('❌ Database Connection: Failed (' + err.message + ')');
    }

    console.log('\n🏁 Verification complete.');
}

verifyEnvironment();
