const pool = require('./config/db');

const testMember = {
    membership_no: "123456789",
    name: "Test Head",
    mobile: "9999999999", // Replaced masked value with a fake full one for testing
    male: 2,
    female: 3,
    district: "Ganjam",
    taluka: "Palur",
    panchayat: "Palur",
    village: "Palur",
    aadhar_no: "999988887777", // Replaced masked value
    family_members: JSON.stringify([{
        "age": "60",
        "name": "Test Head",
        "gender": "Male",
        "relation": "Self"
    }, {
        "age": "50",
        "name": "Test Head wife",
        "gender": "Female",
        "relation": "Wife"
    }, {
        "age": "30",
        "name": "Test Head Son",
        "gender": "Male",
        "mobile": "1111111111",
        "relation": "Son"
    }, {
        "age": "25",
        "name": "Test Head Daughter",
        "gender": "Female",
        "relation": "Daughter"
    }, {
        "age": "23",
        "name": "Test Head Son's wife",
        "gender": "Female",
        "relation": "daughter-in-law"
    }]),
    address: "Palur",
    head_gender: "Male",
    status: "approved"
};

async function seedTestData() {
    console.log('🌱 Seeding Test Member Data...');
    try {
        // Upsert query
        const query = `
            INSERT INTO members (
                membership_no, name, mobile, male, female, 
                district, taluka, panchayat, village, aadhar_no, 
                family_members, address, head_gender, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (membership_no) DO UPDATE SET
                name = EXCLUDED.name,
                mobile = EXCLUDED.mobile,
                family_members = EXCLUDED.family_members,
                village = EXCLUDED.village,
                status = EXCLUDED.status;
        `;

        await pool.query(query, [
            testMember.membership_no, testMember.name, testMember.mobile, testMember.male, testMember.female,
            testMember.district, testMember.taluka, testMember.panchayat, testMember.village, testMember.aadhar_no,
            testMember.family_members, testMember.address, testMember.head_gender, testMember.status
        ]);

        console.log('✅ Test Member seeded successfully!');
        console.log('\n--- Login Test Credentials ---');
        console.log('Option 1 (Head):');
        console.log(`  Membership No: ${testMember.membership_no}`);
        console.log(`  Mobile: ${testMember.mobile}`);
        console.log('\nOption 2 (Son - Adult Family Member):');
        console.log(`  Membership No: ${testMember.membership_no}`);
        console.log(`  Mobile: 1111111111`);

    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
    } finally {
        process.exit();
    }
}

seedTestData();
