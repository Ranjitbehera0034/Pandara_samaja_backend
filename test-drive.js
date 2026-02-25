require('dotenv').config();
const { uploadFile } = require('./config/googleDrive');

async function testDrive() {
    console.log('Testing Google Drive upload...');

    const dummyFile = {
        originalname: 'test_image.txt',
        buffer: Buffer.from('This is a test file for Google Drive upload.'),
    };

    try {
        const url = await uploadFile(dummyFile);
        console.log('✅ Upload successful!');
        console.log('File URL:', url);
    } catch (error) {
        console.error('❌ Upload failed!');
        console.error('Error:', error.message);
        if (error.response && error.response.data) {
            console.error('API Response:', error.response.data);
        }
    }
}

testDrive();
