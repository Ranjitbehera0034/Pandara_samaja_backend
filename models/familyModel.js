const pool = require('../config/db');

// ═══════════════════════════════════════════════════
// FAMILY ALBUMS
// ═══════════════════════════════════════════════════

exports.getAlbums = async (familyHeadId) => {
    const res = await pool.query(
        `SELECT a.*, 
            COUNT(p.id) as photo_count,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', p.id,
                        'url', p.url,
                        'caption', p.caption,
                        'uploadedAt', p.created_at
                    )
                ) FILTER (WHERE p.id IS NOT NULL), '[]'
            ) as photos
         FROM portal_family_albums a 
         LEFT JOIN portal_family_album_photos p ON a.id = p.album_id 
         WHERE a.family_head_id = $1 
         GROUP BY a.id ORDER BY a.created_at DESC`,
        [familyHeadId]
    );
    return res.rows;
};

exports.createAlbum = async (familyHeadId, title, description, coverUrl) => {
    const res = await pool.query(
        `INSERT INTO portal_family_albums (family_head_id, title, description, cover_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [familyHeadId, title, description, coverUrl]
    );
    return res.rows[0];
};

exports.deleteAlbum = async (albumId, familyHeadId) => {
    const res = await pool.query(
        `DELETE FROM portal_family_albums WHERE id = $1 AND family_head_id = $2 RETURNING id`,
        [albumId, familyHeadId]
    );
    return res.rows[0] || null;
};

exports.addPhotosToAlbum = async (albumId, photos) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertedPhotos = [];
        for (const url of photos) {
            const res = await client.query(
                `INSERT INTO portal_family_album_photos (album_id, url) VALUES ($1, $2) RETURNING *`,
                [albumId, url]
            );
            insertedPhotos.push(res.rows[0]);
        }
        await client.query('COMMIT');
        return insertedPhotos;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// ═══════════════════════════════════════════════════
// FAMILY EVENTS
// ═══════════════════════════════════════════════════

exports.getEvents = async (familyHeadId) => {
    const res = await pool.query(
        `SELECT e.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'member_id', r.member_id,
                        'status', r.status
                    )
                ) FILTER (WHERE r.member_id IS NOT NULL), '[]'
            ) as rsvps
         FROM portal_family_events e
         LEFT JOIN portal_family_event_rsvps r ON e.id = r.event_id
         WHERE e.family_head_id = $1
         GROUP BY e.id ORDER BY e.event_date ASC`,
        [familyHeadId]
    );
    return res.rows;
};

exports.createEvent = async (familyHeadId, title, description, eventDate, location, type) => {
    const res = await pool.query(
        `INSERT INTO portal_family_events (family_head_id, title, description, event_date, location, type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [familyHeadId, title, description, eventDate, location, type]
    );
    return res.rows[0];
};

exports.deleteEvent = async (eventId, familyHeadId) => {
    const res = await pool.query(
        `DELETE FROM portal_family_events WHERE id = $1 AND family_head_id = $2 RETURNING id`,
        [eventId, familyHeadId]
    );
    return res.rows[0] || null;
};

exports.rsvpEvent = async (eventId, memberId, status) => {
    const res = await pool.query(
        `INSERT INTO portal_family_event_rsvps (event_id, member_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, member_id) DO UPDATE SET status = $3
         RETURNING *`,
        [eventId, memberId, status]
    );
    return res.rows[0];
};

// ═══════════════════════════════════════════════════
// FAMILY ACCOUNTS
// ═══════════════════════════════════════════════════

exports.getAccounts = async (familyHeadId) => {
    const res = await pool.query(
        `SELECT id, family_head_id, name, username, is_active, created_at 
         FROM portal_family_accounts WHERE family_head_id = $1 ORDER BY created_at DESC`,
        [familyHeadId]
    );
    return res.rows;
};

exports.createAccount = async (familyHeadId, name, username, passwordHash) => {
    const res = await pool.query(
        `INSERT INTO portal_family_accounts (family_head_id, name, username, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, family_head_id, name, username, is_active, created_at`,
        [familyHeadId, name, username, passwordHash]
    );
    return res.rows[0];
};

exports.updateAccountStatus = async (accountId, familyHeadId, isActive) => {
    const res = await pool.query(
        `UPDATE portal_family_accounts SET is_active = $1 WHERE id = $2 AND family_head_id = $3 RETURNING id`,
        [isActive, accountId, familyHeadId]
    );
    return res.rows[0] || null;
};

exports.deleteAccount = async (accountId, familyHeadId) => {
    const res = await pool.query(
        `DELETE FROM portal_family_accounts WHERE id = $1 AND family_head_id = $2 RETURNING id`,
        [accountId, familyHeadId]
    );
    return res.rows[0] || null;
};
