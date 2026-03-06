// routes/imageProxyRoutes.js
// Proxies Google Drive images server-side to avoid 403 hotlink-protection issues.
//
// Netflix/Google-grade HTTP caching semantics:
//   - ETag = fileId → 304 Not Modified on repeat requests
//   - Cache-Control: public, max-age=31536000, immutable (1 year browser cache)
//   - In-memory metadata cache (24h) to avoid double Drive API roundtrips
//   - Graceful 404 fallback — never crashes the page
//
// Re-uses the SAME authenticated Drive client from googleDrive.js so that files
// uploaded by the main upload flow are always accessible here too.

const express = require('express');
const router = express.Router();
const { drive } = require('../config/googleDrive');

// Simple in-memory MIME type cache so we don't call files.get() twice per request.
// node-cache is optional; plain object + TTL is enough at this scale.
const mimeCache = new Map(); // fileId → { mimeType, cachedAt }
const MIME_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedMime(fileId) {
    const entry = mimeCache.get(fileId);
    if (entry && Date.now() - entry.cachedAt < MIME_CACHE_TTL_MS) return entry.mimeType;
    return null;
}

function setCachedMime(fileId, mimeType) {
    mimeCache.set(fileId, { mimeType, cachedAt: Date.now() });
    // Prevent unbounded memory growth — keep cache size under 5,000 entries
    if (mimeCache.size > 5000) {
        const firstKey = mimeCache.keys().next().value;
        mimeCache.delete(firstKey);
    }
}

/**
 * GET /api/v1/image-proxy/:fileId
 * Streams a Google Drive file to the browser with full CDN-style caching.
 */
router.get('/:fileId', async (req, res) => {
    const { fileId } = req.params;

    // Basic validation – Google Drive file IDs are alphanumeric + dash + underscore, 10+ chars
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID' });
    }

    // ── ETag / 304 Not Modified ──────────────────────────────────────────────
    // Since Drive file content is immutable once uploaded, the fileId IS the ETag.
    const etag = `"${fileId}"`;
    if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
    }

    try {
        // ── Resolve MIME type (cached after first request) ──────────────────
        let mimeType = getCachedMime(fileId);
        if (!mimeType) {
            const meta = await drive.files.get({ fileId, fields: 'mimeType' });
            mimeType = meta.data.mimeType || 'image/jpeg';
            setCachedMime(fileId, mimeType);
        }

        // ── Stream file content from Drive ───────────────────────────────────
        const fileStream = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        // ── CDN-style response headers ───────────────────────────────────────
        res.setHeader('Content-Type', mimeType);
        // 1 year, immutable = browser never re-requests; ETag handles revalidation
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', etag);
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Access-Control-Allow-Origin', '*');

        fileStream.data.pipe(res);

        // Clean up stream on client disconnect to avoid memory leaks
        res.on('close', () => fileStream.data.destroy?.());

    } catch (err) {
        console.error('[ImageProxy] Failed to proxy file:', fileId, err.message);
        // Return a transparent 1x1 GIF as fallback so <img> tags don't break layouts
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store');
        res.status(404).end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
});

module.exports = router;
