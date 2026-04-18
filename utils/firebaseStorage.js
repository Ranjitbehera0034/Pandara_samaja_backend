const admin = require('../config/firebase');
const sharp = require('sharp');
const path = require('path');

const bucket = admin.storage().bucket();

/**
 * Predefined paths for better organization
 */
const UPLOAD_PATHS = {
    MEMBER_PROFILE: (mobile) => `members/${mobile}/profile`,
    MEMBER_POSTS: (mobile) => `members/${mobile}/posts`,
    MEMBER_GALLERY: (mobile) => `members/${mobile}/gallery`,
    MATRIMONY_FORM: (mobile) => `matrimony/forms/${mobile}`,
    MATRIMONY_CANDIDATE: (mobile) => `matrimony/candidates/${mobile}`,
    LEADER_PHOTO: (level) => `leaders/${level}`,
    BLOG_PHOTO: () => `blogs/${new Date().toISOString().split('T')[0]}`,
    ADMIN_UPLOAD: (adminId, type) => `admins/${adminId}/${type}`
};

/**
 * Uploads a file to Firebase Storage with optimization
 * 
 * @param {Object} file - Multer file object
 * @param {String} destinationPath - The folder path in the bucket
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
async function uploadToFirebase(file, destinationPath) {
    if (!file) throw new Error('No file provided for upload');

    const fileName = `${Date.now()}_${path.parse(file.originalname).name}`;
    let finalBuffer = file.buffer;
    let finalMimeType = file.mimetype;
    let finalExtension = path.extname(file.originalname);

    // Image Optimization Pipeline
    if (file.mimetype.startsWith('image/') && !file.mimetype.includes('gif')) {
        finalBuffer = await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        
        finalMimeType = 'image/webp';
        finalExtension = '.webp';
    }

    const fullPath = `${destinationPath}/${fileName}${finalExtension}`;
    const storageFile = bucket.file(fullPath);

    await storageFile.save(finalBuffer, {
        metadata: {
            contentType: finalMimeType,
        },
        public: true // Automatically make it public for browser access
    });

    // Construct the public URL
    // Format: https://storage.googleapis.com/{bucket_name}/{file_path}
    return `https://storage.googleapis.com/${bucket.name}/${fullPath}`;
}

module.exports = {
    uploadToFirebase,
    UPLOAD_PATHS
};
