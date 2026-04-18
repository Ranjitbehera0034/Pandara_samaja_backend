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
    ADMIN_UPLOAD: (adminId, type) => `admins/${adminId}/${type}`,
    REELS: (authorId) => `reels/${authorId}`
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

    // Image Optimization Pipeline (only for images)
    if (file.mimetype.startsWith('image/') && !file.mimetype.includes('gif')) {
        try {
            finalBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            
            finalMimeType = 'image/webp';
            finalExtension = '.webp';
        } catch (err) {
            console.warn('Sharp optimization failed, using original buffer:', err.message);
        }
    }

    const fullPath = `${destinationPath}/${fileName}${finalExtension}`;
    const storageFile = bucket.file(fullPath);

    await storageFile.save(finalBuffer, {
        metadata: {
            contentType: finalMimeType,
        },
        public: false // PRIVACY: Only accessible via signed URLs or Admin SDK
    });

    // Construct a proxy URL that handles authentication and signed URL generation
    // Format: /api/v1/portal/media?path={fullPath}
    // This allows us to check session before redirecting to a signed URL
    return `/api/v1/portal/media?path=${encodeURIComponent(fullPath)}`;
}

/**
 * Resolves a private media path or proxy URL into a temporary Firebase Signed URL.
 * 
 * @param {String} source - The raw path (e.g., "blogs/...") OR a proxy URL (/api/v1/portal/media?path=...)
 * @param {Number} expiresMinutes - Optional duration (default 60 mins)
 * @returns {Promise<String>} - The signed URL
 */
async function getSignedMediaUrl(source, expiresMinutes = 60) {
    if (!source || typeof source !== 'string') return source;

    let filePath = source;

    // Detect if it's already a proxy URL and extract the path
    if (source.includes('/media?path=')) {
        try {
            const urlObj = new URL(source, 'http://localhost'); // Dummy base for parsing
            filePath = urlObj.searchParams.get('path');
        } catch (e) {
            // If parsing fails, use regex as fallback
            const match = source.match(/path=([^&]+)/);
            if (match) filePath = decodeURIComponent(match[1]);
        }
    }

    // Basic check for Firebase path (must not be a full URL already)
    if (!filePath || filePath.startsWith('http')) return source;

    try {
        const storageFile = bucket.file(filePath);
        const [url] = await storageFile.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * expiresMinutes,
        });
        return url;
    } catch (err) {
        console.warn(`Failed to sign media URL for ${filePath}:`, err.message);
        return source; // Fallback to original
    }
}

module.exports = {
    uploadToFirebase,
    getSignedMediaUrl,
    UPLOAD_PATHS
};
