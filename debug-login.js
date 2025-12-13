/**
 * Debug Login Script
 * This adds logging to see what credentials are being received
 */

// Add this to your authController.js login function temporarily for debugging

/*
static async login(req, res) {
  try {
    const { username, password } = req.body;
    
    // DEBUG LOGGING - Add these lines
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    console.log('Username received:', username);
    console.log('Password received:', password ? `${password.substring(0, 3)}***` : 'undefined');
    console.log('Username type:', typeof username);
    console.log('Password type:', typeof password);
    console.log('====================');

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // ... rest of the code
*/

// Quick test from command line:
const testCases = [
    { username: 'admin', password: 'admin123', expected: 'SUCCESS' },
    { username: ' admin', password: 'admin123', expected: 'FAIL - leading space' },
    { username: 'admin ', password: 'admin123', expected: 'FAIL - trailing space' },
    { username: 'Admin', password: 'admin123', expected: 'FAIL - wrong case' },
    { username: 'admin', password: 'Admin123', expected: 'FAIL - wrong password' },
    { username: 'admin', password: '', expected: 'FAIL - empty password' },
];

console.log('Common Login Issues to Check:');
console.log('');
console.log('1. Username/password have extra spaces');
console.log('2. Case sensitivity (admin vs Admin)');
console.log('3. Empty strings being sent');
console.log('4. Wrong form field names in HTML');
console.log('5. Password visible/hidden input issues');
console.log('');
console.log('Test these curl commands:');
console.log('');

testCases.forEach((test, i) => {
    console.log(`Test ${i + 1}: ${test.expected}`);
    console.log(`curl -X POST http://localhost:5000/api/auth/login \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"username":"${test.username}","password":"${test.password}"}'`);
    console.log('');
});
