// routes/imageProxyRoutes.js
// Proxies Google Drive images server-side to avoid 403 hotlink-protection issues
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Re-use the same auth strategy from googleDrive.js
let drive;
if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    drive = google.drive({ version: 'v3', auth: oauth2Client });
} else {
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS) {
        try { credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS); } catch (e) { /* ignore */ }
    }
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    drive = google.drive({ version: 'v3', auth });
}

/**
 * GET /api/image-proxy/:fileId
 * Streams a Google Drive file to the browser, bypassing cross-origin restrictions.
 */
router.get('/:fileId', async (req, res) => {
    const { fileId } = req.params;

    // Basic validation – Google Drive file IDs are alphanumeric + dash + underscore
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID' });
    }

    try {
        // Get file metadata first (for content type)
        const meta = await drive.files.get({ fileId, fields: 'mimeType,name' });
        const mimeType = meta.data.mimeType || 'image/jpeg';

        // Stream the file content
        const fileStream = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // cache for 24h in browser
        res.setHeader('Access-Control-Allow-Origin', '*');

        fileStream.data.pipe(res);
    } catch (err) {
        console.error('[ImageProxy] Failed to proxy file:', fileId, err.message);
        res.status(404).json({ error: 'Image not found or not accessible' });
    }
});

module.exports = router;
