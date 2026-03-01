const crypto = require('crypto');

// Configuration
// In production, ENCRYPTION_KEY MUST be a 32-byte hex string (64 characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns null if the input is null or if no key is configured.
 */
function encrypt(text) {
    if (!text) return null;
    if (!ENCRYPTION_KEY) {
        console.warn('⚠️ WARNING: ENCRYPTION_KEY not set. Storing Aadhaar in PLAINTEXT. This is insecure!');
        return text;
    }

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Return iv:encrypted as a joined string
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error('Encryption error:', err);
        return text;
    }
}

/**
 * Decrypt a cipher text string.
 * Returns the decrypted string, or the original text if decryption fails or no key is set.
 */
function decrypt(text) {
    if (!text) return null;
    if (!ENCRYPTION_KEY) return text;

    try {
        const parts = text.split(':');
        if (parts.length !== 2) return text; // Likely not encrypted

        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        // If decryption fails, it's likely plaintext or wrong key
        return text;
    }
}

module.exports = {
    encrypt,
    decrypt
};
