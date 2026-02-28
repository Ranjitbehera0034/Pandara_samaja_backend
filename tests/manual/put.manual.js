const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'pandaramatrimony2024!', { expiresIn: '1d' });

fetch('http://localhost:5000/api/members/123456789', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
        "membership_no": "123456789",
        "name": "Test Head NEW",
        "mobile": "9999999999",
        "male": 2,
        "female": 3,
        "district": "Ganjam",
        "taluka": "Palur",
        "panchayat": "Palur",
        "village": "Palur",
        "aadhar_no": "999999999999",
        "family_members": [{
            "age": 60,
            "name": "Test Head",
            "gender": "Male",
            "relation": "Self"
        }],
        "address": "Palur",
        "head_gender": "Male"
    })
}).then(r => r.json()).then(data => console.log('RES:', data)).catch(e => console.error(e));
