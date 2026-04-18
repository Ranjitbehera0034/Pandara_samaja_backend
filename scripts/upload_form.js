const path = require('path');
const fs = require('fs');
const admin = require('../config/firebase');

// Initialize storage with explicit bucket name
const BUCKET_NAME = 'nikhila-odisha-pandara-samaja.firebasestorage.app';
const bucket = admin.storage().bucket(BUCKET_NAME);

async function uploadForm() {
    console.log('Uploading matrimony form to Firebase Storage...');
    
    const localFilePath = path.join(__dirname, '../../Pandara_samaja/admin-app/public/assets/forms/CASTE_MATRIMONY.pdf');
    
    if (!fs.existsSync(localFilePath)) {
        console.error('File not found at:', localFilePath);
        process.exit(1);
    }
    
    const destination = 'pandarasamaja document/matrimony form/CASTE_MATRIMONY.pdf';
    
    try {
        await bucket.upload(localFilePath, {
            destination: destination,
            metadata: {
                contentType: 'application/pdf',
            }
        });
        
        console.log('Upload successful to:', destination);
        
        // Make the file publicly readable
        const file = bucket.file(destination);
        await file.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${encodeURIComponent(destination)}`;
        console.log('✅ Public URL:', publicUrl);
        
    } catch (error) {
        console.error('Error uploading file:', error.message);
        process.exit(1);
    }
    
    process.exit(0);
}

uploadForm();
