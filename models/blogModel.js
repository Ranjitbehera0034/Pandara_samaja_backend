const db = require('../config/db');

exports.getAll = () => db.query('SELECT * FROM posts ORDER BY created_at DESC');

exports.getOne = (id) => db.query('SELECT * FROM posts WHERE id = $1', [id]);

exports.create = ({ title, content, image_url, video_url }) =>
  db.query('INSERT INTO posts (title, content, image_url, video_url) VALUES ($1, $2, $3, $4) RETURNING *', [title, content, image_url, video_url]);

exports.update = (id, { title, content, image_url, video_url }) =>
  db.query('UPDATE posts SET title = $1, content = $2, image_url = $3, video_url = $4 WHERE id = $5 RETURNING *', [title, content, image_url, video_url, id]);

exports.remove = id => db.query('DELETE FROM posts WHERE id = $1', [id]);

/**
 * Record a video view event.
 * - Atomically increments views_count on the post.
 * - Inserts a viewer log row (every watch is recorded; no dedup).
 *
 * @param {number|string} postId
 * @param {{ type: 'member'|'admin', id: string, name: string, mobile?: string }} viewer
 */
exports.recordVideoView = async (postId, viewer) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Increment the aggregate counter
        await client.query(
            `UPDATE posts
             SET views_count = COALESCE(views_count, 0) + 1
             WHERE id = $1`,
            [postId]
        );

        // Insert detailed log row
        await client.query(
            `INSERT INTO post_video_views
                (post_id, viewer_type, viewer_id, viewer_name, viewer_mobile)
             VALUES ($1, $2, $3, $4, $5)`,
            [postId, viewer.type, viewer.id, viewer.name || null, viewer.mobile || null]
        );

        const { rows } = await client.query(
            `SELECT views_count FROM posts WHERE id = $1`,
            [postId]
        );

        await client.query('COMMIT');
        return { views_count: rows[0]?.views_count ?? 0 };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Get paginated list of viewers for a specific post (admin dashboard use).
 *
 * @param {number|string} postId
 * @param {number} limit
 * @param {number} offset
 * @returns {{ viewers: Array, total: number }}
 */
exports.getVideoViewers = async (postId, limit = 20, offset = 0) => {
    const [dataRes, countRes] = await Promise.all([
        db.query(
            `SELECT id, viewer_type, viewer_id, viewer_name, viewer_mobile, watched_at
             FROM post_video_views
             WHERE post_id = $1
             ORDER BY watched_at DESC
             LIMIT $2 OFFSET $3`,
            [postId, limit, offset]
        ),
        db.query(
            `SELECT COUNT(*) AS total FROM post_video_views WHERE post_id = $1`,
            [postId]
        )
    ]);

    return {
        viewers: dataRes.rows,
        total: parseInt(countRes.rows[0].total, 10)
    };
};
