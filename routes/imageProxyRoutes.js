// routes/imageProxyRoutes.js
// Proxies Google Drive images server-side to avoid 403 hotlink-protection issues.
// Re-uses the SAME authenticated Drive client from googleDrive.js so that files
// uploaded by the main upload flow are always accessible here too.
const express = require('express');
const router = express.Router();
const { drive } = require('../config/googleDrive');

/**
 * GET /api/v1/image-proxy/:fileId
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
