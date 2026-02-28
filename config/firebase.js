const admin = require('firebase-admin');
const fs = require('fs');

/**
 * Initializes Firebase Admin SDK
 * Priority order:
 * 1. FIREBASE_SERVICE_ACCOUNT env var (JSON string)
 * 2. FIREBASE_SERVICE_ACCOUNT_PATH env var (path to JSON file, e.g. Render secret files)
 * 3. /etc/secrets/firebase-service-account.json (Render secret file default)
 * 4. ./firebase-service-account.json (local dev fallback)
 */

let serviceAccount;

// 1. Try JSON string from env
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Firebase: Loaded from FIREBASE_SERVICE_ACCOUNT env var');
    } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err);
    }
}

// 2. Try file path from env (e.g. Render secret file)
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
        const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (fs.existsSync(filePath)) {
            serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`✅ Firebase: Loaded from ${filePath}`);
        }
    } catch (err) {
        console.error("Failed to load from FIREBASE_SERVICE_ACCOUNT_PATH:", err);
    }
}

// 3. Try Render secret file default path
if (!serviceAccount) {
    try {
        const renderSecretPath = '/etc/secrets/nikhila-odisha-pandara-samaja-firebase-adminsdk-fbsvc-1d4aa944e7.json';
        if (fs.existsSync(renderSecretPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(renderSecretPath, 'utf8'));
            console.log('✅ Firebase: Loaded from Render secret file');
        }
    } catch (err) {
        console.error("Failed to load from Render secret path:", err);
    }
}

// 4. Try local config directory fallback
if (!serviceAccount) {
    try {
        serviceAccount = require('./firebase-service-account.json');
        console.log('✅ Firebase: Loaded from local config directory');
    } catch (err) {
        console.warn("⚠️ Firebase: No service account found. Firebase Auth will not work.");
        console.warn("   Set FIREBASE_SERVICE_ACCOUNT_PATH or upload secret file to Render.");
    }
}

let firebaseAdmin;
if (serviceAccount) {
    firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    // Initialize without credentials — will fail on auth calls but won't crash the server
    try {
        firebaseAdmin = admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    } catch (err) {
        console.error("❌ Firebase: Could not initialize. Firebase login will not work.");
        firebaseAdmin = null;
    }
}

module.exports = firebaseAdmin;