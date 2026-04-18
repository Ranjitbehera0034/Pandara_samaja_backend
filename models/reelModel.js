const pool = require('../config/db');

/**
 * Create a new reel
 */
exports.create = async ({ authorId, authorName, authorMobile, videoUrl, thumbnailUrl, caption, musicName }) => {
    const res = await pool.query(
        `INSERT INTO portal_reels (author_id, author_name, author_mobile, video_url, thumbnail_url, caption, music_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [authorId, authorName, authorMobile, videoUrl, thumbnailUrl || null, caption || null, musicName || 'Original Audio']
    );
    return res.rows[0];
};

/**
 * Get all reels with like status for current user
 */
exports.getAll = async ({ membershipNo, mobile, limit = 20, offset = 0 }) => {
    const res = await pool.query(
        `SELECT r.*,
            m.village AS author_village,
            m.district AS author_district,
            REPLACE(COALESCE(
               (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = r.author_name LIMIT 1),
               m.profile_photo_url
            ), 'drive.google.com/uc?id=', '/api/v1/image-proxy/') AS author_photo,
            EXISTS(
              SELECT 1 FROM reel_likes l
              WHERE l.reel_id = r.id AND l.member_id = $1 AND l.member_mobile = $2
            ) AS liked_by_me
         FROM portal_reels r
         JOIN members m ON m.membership_no = r.author_id
         ORDER BY r.created_at DESC
         LIMIT $3 OFFSET $4`,
        [membershipNo || '', mobile || '', limit, offset]
    );
    return res.rows;
};

/**
 * Increment view count
 */
exports.incrementView = async (reelId) => {
    await pool.query(
        `UPDATE portal_reels SET views_count = views_count + 1 WHERE id = $1`,
        [reelId]
    );
};

/**
 * Increment share count
 */
exports.incrementShare = async (reelId) => {
    await pool.query(
        `UPDATE portal_reels SET shares_count = shares_count + 1 WHERE id = $1`,
        [reelId]
    );
};

/**
 * Toggle like
 */
exports.toggleLike = async (reelId, memberId, memberMobile) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            `SELECT id FROM reel_likes WHERE reel_id = $1 AND member_id = $2 AND member_mobile = $3`,
            [reelId, memberId, memberMobile]
        );

        let liked;
        if (existing.rows.length > 0) {
            await client.query(
                `DELETE FROM reel_likes WHERE reel_id = $1 AND member_id = $2 AND member_mobile = $3`,
                [reelId, memberId, memberMobile]
            );
            await client.query(
                `UPDATE portal_reels SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
                [reelId]
            );
            liked = false;
        } else {
            await client.query(
                `INSERT INTO reel_likes (reel_id, member_id, member_mobile) VALUES ($1, $2, $3)`,
                [reelId, memberId, memberMobile]
            );
            await client.query(
                `UPDATE portal_reels SET likes_count = likes_count + 1 WHERE id = $1`,
                [reelId]
            );
            liked = true;
        }

        const countRes = await client.query(
            `SELECT likes_count FROM portal_reels WHERE id = $1`,
            [reelId]
        );

        await client.query('COMMIT');
        return { liked, likes_count: countRes.rows[0].likes_count };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Delete a reel
 */
exports.delete = async (reelId, authorId) => {
    const res = await pool.query(
        `DELETE FROM portal_reels WHERE id = $1 AND author_id = $2 RETURNING id`,
        [reelId, authorId]
    );
    return res.rows[0];
};
