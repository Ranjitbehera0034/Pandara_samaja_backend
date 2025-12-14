const BASE_URL = 'http://localhost:5000/api';

async function testMasking() {
    try {
        console.log('--- TEST 1: Public Access (No Token) ---');
        try {
            const res = await fetch(`${BASE_URL}/members`);
            const data = await res.json();

            const userWithMobile = data.find(m => m.mobile && m.mobile.length > 5);

            if (userWithMobile) {
                console.log(`Found member: ${userWithMobile.name}, Mobile: ${userWithMobile.mobile}`);
                if (userWithMobile.mobile.includes('***')) {
                    console.log('✅ PASSED: Mobile is masked');
                } else {
                    console.log('❌ FAILED: Mobile is NOT masked');
                }
            } else {
                console.log('⚠️ No members with valid mobile found to test');
            }
        } catch (err) {
            console.error('Error fetching members:', err.message);
        }

        console.log('\n--- TEST 2: Admin Access (With Token) ---');
        // 1. Login
        let token;
        try {
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
                throw new Error(loginData.message);
            }
            token = loginData.token;
            console.log('Logged in as admin');
        } catch (err) {
            console.error('Login failed:', err.message);
            return;
        }

        // 2. Fetch members with token
        try {
            const res = await fetch(`${BASE_URL}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            const userWithMobile = data.find(m => m.mobile && m.mobile.replace(/\*/g, '').length > 5);

            if (userWithMobile) {
                console.log(`Found member (Admin): ${userWithMobile.name}, Mobile: ${userWithMobile.mobile}`);
                if (!userWithMobile.mobile.toString().includes('***')) {
                    console.log('✅ PASSED: Mobile is NOT masked for admin');
                } else {
                    console.log('❌ FAILED: Mobile IS masked explicitly for admin');
                }
            }
        } catch (err) {
            console.error('Error fetching members as admin:', err.message);
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

testMasking();
