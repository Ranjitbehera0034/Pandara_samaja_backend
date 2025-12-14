const BASE_URL = 'http://localhost:5000/api';

async function testLoginNotification() {
    try {
        console.log('=== Testing Login Notification Flow ===\n');

        // Step 1: Login
        console.log('Step 1: Logging in as admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginData = await loginRes.json();

        if (!loginData.success) {
            console.error('❌ Login failed:', loginData.message);
            return;
        }

        console.log('✅ Login successful!');
        console.log('   Token:', loginData.token.substring(0, 20) + '...');
        console.log('   User:', loginData.user.username);
        console.log('   Role:', loginData.user.role);

        // Step 2: Send notification
        console.log('\nStep 2: Sending login notification email...');
        const notifyRes = await fetch(`${BASE_URL}/auth/notify-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        const notifyData = await notifyRes.json();

        if (notifyData.success) {
            console.log('✅ Notification sent successfully!');
            console.log('   Message:', notifyData.message);
            console.log('\n📧 Check your email at the configured ALERT_EMAIL_TO address');
        } else {
            console.error('❌ Notification failed:', notifyData.message);
        }

    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testLoginNotification();
