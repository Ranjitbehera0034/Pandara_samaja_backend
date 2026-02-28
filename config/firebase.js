const admin = require('firebase-admin');

/**
 * Initializes Firebase Admin SDK
 * Place your service account JSON file in the config directory as 'firebase-service-account.json'
 * OR set the FIREBASE_SERVICE_ACCOUNT environment variable with the JSON content.
 */

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err);
    }
}

if (!serviceAccount) {
    try {
        serviceAccount = require('./firebase-service-account.json');
    } catch (_err) {
        console.warn("⚠️ firebase-service-account.json not found in config directory. Firebase Admin might not initialize correctly if no environment credentials exist.");
    }
}

const firebaseAdmin = admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault()
});

module.exports = firebaseAdmin;
