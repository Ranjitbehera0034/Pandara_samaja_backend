// models/portalModel.js — Data layer for Member Portal features
const pool = require('../config/db');

// ═══════════════════════════════════════════════════
//  MEMBER LOGIN / PROFILE
// ═══════════════════════════════════════════════════

/**
 * Find a member by membership_no and verify the mobile number.
 * Returns the member row if both match, null otherwise.
 */
exports.findByCredentials = async (membershipNo, mobile) => {
    const res = await pool.query(
        `SELECT * FROM members WHERE membership_no = $1`,
        [membershipNo]
    );
    const member = res.rows[0];
    if (!member) return null;

    const inputMobile = (mobile || '').replace(/\D/g, '');
    if (!inputMobile) return null;

    let matchedUser = null;

    // Check head of family mobile
    const dbMobile = (member.mobile || '').replace(/\D/g, '');
    if (dbMobile === inputMobile) {
        matchedUser = { name: member.name, relation: 'Self/Head' };
    }

    // Check family members
    if (!matchedUser && Array.isArray(member.family_members)) {
        for (const fm of member.family_members) {
            const fmMobile = (fm.mobile || '').replace(/\D/g, '');
            const fmAge = Number(fm.age) || 0;
            if (fmMobile === inputMobile && fmAge >= 18) {
                matchedUser = { name: fm.name, relation: fm.relation };
                break;
            }
        }
    }

    if (!matchedUser) return null;

    // Update last portal login
    await pool.query(
        `UPDATE members SET last_portal_login = CURRENT_TIMESTAMP WHERE membership_no = $1`,
        [membershipNo]
    );

    return { member, matchedUser };
};

/**
 * Get member profile by membership_no (full details for logged-in member)
 */
exports.getMemberProfile = async (membershipNo) => {
    const res = await pool.query(
        `SELECT * FROM members WHERE membership_no = $1`,
        [membershipNo]
    );
    return res.rows[0] || null;
};

/**
 * Update member profile (only fields a member is allowed to edit)
 */
exports.updateMemberProfile = async (membershipNo, data) => {
    const fields = ['name', 'mobile', 'aadhar_no', 'address', 'district', 'taluka', 'panchayat', 'village', 'profile_photo_url', 'head_gender', 'male', 'female', 'family_members'];
    const sets = [];
    const vals = [];
    let idx = 1;

    for (const field of fields) {
        if (data[field] !== undefined) {
            sets.push(`${field} = $${idx}`);
            // family_members is JSONB, need to stringify if it's an object/array
            if (field === 'family_members' && typeof data[field] !== 'string') {
                vals.push(JSON.stringify(data[field]));
            } else {
                vals.push(data[field]);
            }
            idx++;
        }
    }

    if (sets.length === 0) return exports.getMemberProfile(membershipNo);

    vals.push(membershipNo);
    const query = `UPDATE members SET ${sets.join(', ')} WHERE membership_no = $${idx} RETURNING *`;
    const res = await pool.query(query, vals);
    return res.rows[0];
};


// ═══════════════════════════════════════════════════
//  COMMUNITY POSTS (FEED)
// ═══════════════════════════════════════════════════

/**
 * Create a new community post
 */
exports.createPost = async ({ authorId, textContent, images, location }) => {
    const res = await pool.query(
        `INSERT INTO portal_posts (author_id, text_content, images, location)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [authorId, textContent || null, images || [], location || null]
    );
    return res.rows[0];
};

/**
 * Get all posts (paginated) with author info and like/comment counts
 */
exports.getPosts = async ({ page = 1, limit = 20, membershipNo = null }) => {
    const offset = (page - 1) * limit;
    const res = await pool.query(
        `SELECT p.*,
            m.name AS author_name,
            m.village AS author_village,
            m.district AS author_district,
            m.profile_photo_url AS author_photo,
            EXISTS(
              SELECT 1 FROM portal_likes l
              WHERE l.post_id = p.id AND l.member_id = $3
            ) AS liked_by_me
     FROM portal_posts p
     JOIN members m ON m.membership_no = p.author_id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
        [limit, offset, membershipNo || '']
    );
    return res.rows;
};

/**
 * Get single post with author data
 */
exports.getPost = async (postId, membershipNo) => {
    const res = await pool.query(
        `SELECT p.*,
            m.name AS author_name,
            m.village AS author_village,
            m.district AS author_district,
            m.profile_photo_url AS author_photo,
            EXISTS(
              SELECT 1 FROM portal_likes l
              WHERE l.post_id = p.id AND l.member_id = $2
            ) AS liked_by_me
     FROM portal_posts p
     JOIN members m ON m.membership_no = p.author_id
     WHERE p.id = $1`,
        [postId, membershipNo || '']
    );
    return res.rows[0] || null;
};

/**
 * Delete a post (only by the author)
 */
exports.deletePost = async (postId, authorId) => {
    const res = await pool.query(
        `DELETE FROM portal_posts WHERE id = $1 AND author_id = $2 RETURNING id`,
        [postId, authorId]
    );
    return res.rows[0] || null;
};

/**
 * Edit a post (only by the author)
 */
exports.editPost = async (postId, authorId, newText) => {
    const res = await pool.query(
        `UPDATE portal_posts SET text_content = $1, updated_at = NOW()
         WHERE id = $2 AND author_id = $3
         RETURNING *`,
        [newText, postId, authorId]
    );
    return res.rows[0] || null;
};

/**
 * Report a post
 */
exports.reportPost = async (postId, reporterId, reason) => {
    // Use a simple INSERT — create table if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS portal_reports (
            id SERIAL PRIMARY KEY,
            post_id INTEGER REFERENCES portal_posts(id) ON DELETE CASCADE,
            reporter_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, reporter_id)
        )
    `);
    const res = await pool.query(
        `INSERT INTO portal_reports (post_id, reporter_id, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, reporter_id) DO UPDATE SET reason = $3, created_at = NOW()
         RETURNING *`,
        [postId, reporterId, reason]
    );
    return res.rows[0];
};


// ═══════════════════════════════════════════════════
//  LIKES
// ═══════════════════════════════════════════════════

/**
 * Toggle like on a post. Returns { liked: boolean, likes_count: number }
 */
exports.toggleLike = async (postId, memberId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the post row so concurrent likes don't race
        await client.query(
            `SELECT id FROM portal_posts WHERE id = $1 FOR UPDATE`,
            [postId]
        );

        // Check if already liked
        const existing = await client.query(
            `SELECT id FROM portal_likes WHERE post_id = $1 AND member_id = $2`,
            [postId, memberId]
        );

        let liked;
        if (existing.rows.length > 0) {
            // Unlike
            await client.query(
                `DELETE FROM portal_likes WHERE post_id = $1 AND member_id = $2`,
                [postId, memberId]
            );
            await client.query(
                `UPDATE portal_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
                [postId]
            );
            liked = false;
        } else {
            // Like — use ON CONFLICT to handle any remaining race
            await client.query(
                `INSERT INTO portal_likes (post_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [postId, memberId]
            );
            await client.query(
                `UPDATE portal_posts SET likes_count = likes_count + 1 WHERE id = $1`,
                [postId]
            );
            liked = true;
        }

        // Get updated count
        const countRes = await client.query(
            `SELECT likes_count FROM portal_posts WHERE id = $1`,
            [postId]
        );

        await client.query('COMMIT');
        return { liked, likes_count: countRes.rows[0]?.likes_count || 0 };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};


// ═══════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════

/**
 * Add a comment to a post
 */
exports.addComment = async (postId, memberId, text) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(
            `INSERT INTO portal_comments (post_id, member_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [postId, memberId, text]
        );

        await client.query(
            `UPDATE portal_posts SET comments_count = comments_count + 1 WHERE id = $1`,
            [postId]
        );

        await client.query('COMMIT');

        // Fetch with author name
        const commentWithAuthor = await pool.query(
            `SELECT c.*, m.name AS author_name
       FROM portal_comments c
       JOIN members m ON m.membership_no = c.member_id
       WHERE c.id = $1`,
            [res.rows[0].id]
        );

        return commentWithAuthor.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Get comments for a post
 */
exports.getComments = async (postId) => {
    const res = await pool.query(
        `SELECT c.*, m.name AS author_name
     FROM portal_comments c
     JOIN members m ON m.membership_no = c.member_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
        [postId]
    );
    return res.rows;
};

/**
 * Delete a comment (only by author)
 */
exports.deleteComment = async (commentId, memberId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(
            `DELETE FROM portal_comments WHERE id = $1 AND member_id = $2 RETURNING post_id`,
            [commentId, memberId]
        );

        if (res.rows[0]) {
            await client.query(
                `UPDATE portal_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1`,
                [res.rows[0].post_id]
            );
        }

        await client.query('COMMIT');
        return res.rows[0] || null;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};


// ═══════════════════════════════════════════════════
//  PHOTOS (GALLERY)
// ═══════════════════════════════════════════════════

/**
 * Add a photo to member's gallery
 */
exports.addPhoto = async (memberId, url, caption) => {
    const res = await pool.query(
        `INSERT INTO portal_photos (member_id, url, caption)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [memberId, url, caption || null]
    );
    return res.rows[0];
};

/**
 * Get member's photos
 */
exports.getPhotos = async (memberId) => {
    const res = await pool.query(
        `SELECT * FROM portal_photos
     WHERE member_id = $1
     ORDER BY created_at DESC`,
        [memberId]
    );
    return res.rows;
};

/**
 * Delete a photo (only by owner)
 */
exports.deletePhoto = async (photoId, memberId) => {
    const res = await pool.query(
        `DELETE FROM portal_photos WHERE id = $1 AND member_id = $2 RETURNING *`,
        [photoId, memberId]
    );
    return res.rows[0] || null;
};


// ═══════════════════════════════════════════════════
//  SUBSCRIPTIONS (FOLLOW / UNFOLLOW)
// ═══════════════════════════════════════════════════

/**
 * Toggle subscription. Returns { subscribed: boolean }
 */
exports.toggleSubscription = async (followerId, followingId) => {
    if (followerId === followingId) {
        throw new Error('Cannot subscribe to yourself');
    }

    const existing = await pool.query(
        `SELECT id FROM portal_subscriptions WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
    );

    if (existing.rows.length > 0) {
        await pool.query(
            `DELETE FROM portal_subscriptions WHERE follower_id = $1 AND following_id = $2`,
            [followerId, followingId]
        );
        return { subscribed: false };
    } else {
        await pool.query(
            `INSERT INTO portal_subscriptions (follower_id, following_id) VALUES ($1, $2)`,
            [followerId, followingId]
        );
        return { subscribed: true };
    }
};

/**
 * Get a member's subscriptions (who they follow)
 */
exports.getSubscriptions = async (memberId) => {
    const res = await pool.query(
        `SELECT s.following_id, m.name, m.village, m.district, m.profile_photo_url, m.membership_no
     FROM portal_subscriptions s
     JOIN members m ON m.membership_no = s.following_id
     WHERE s.follower_id = $1
     ORDER BY s.created_at DESC`,
        [memberId]
    );
    return res.rows;
};

/**
 * Get followers of a member
 */
exports.getFollowers = async (memberId) => {
    const res = await pool.query(
        `SELECT s.follower_id, m.name, m.village, m.district, m.profile_photo_url, m.membership_no
     FROM portal_subscriptions s
     JOIN members m ON m.membership_no = s.follower_id
     WHERE s.following_id = $1
     ORDER BY s.created_at DESC`,
        [memberId]
    );
    return res.rows;
};

/**
 * Get all members with subscription status for the current member
 */
exports.getMembersWithSubscription = async (currentMemberId) => {
    const res = await pool.query(
        `SELECT m.membership_no, m.name, m.village, m.district, m.profile_photo_url,
            EXISTS(
              SELECT 1 FROM portal_subscriptions s
              WHERE s.follower_id = $1 AND s.following_id = m.membership_no
            ) AS is_subscribed
     FROM members m
     WHERE m.membership_no != $1
     ORDER BY m.name`,
        [currentMemberId]
    );
    return res.rows;
};


// ═══════════════════════════════════════════════════
//  DIRECT MESSAGES (CHAT)
// ═══════════════════════════════════════════════════

// Save a message
module.exports.saveMessage = async (senderId, receiverId, content, type = 'text') => {
    const res = await pool.query(
        `INSERT INTO portal_messages (sender_id, receiver_id, content, type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [senderId, receiverId, content, type]
    );
    return res.rows[0];
};

// Get conversation between two members
module.exports.getConversation = async (memberId1, memberId2, limit = 50, offset = 0) => {
    const res = await pool.query(
        `SELECT m.*,
                s.name AS sender_name,
                s.profile_photo_url AS sender_avatar,
                r.name AS receiver_name
         FROM portal_messages m
         JOIN members s ON s.membership_no = m.sender_id
         JOIN members r ON r.membership_no = m.receiver_id
         WHERE (m.sender_id = $1 AND m.receiver_id = $2)
            OR (m.sender_id = $2 AND m.receiver_id = $1)
         ORDER BY m.created_at ASC
         LIMIT $3 OFFSET $4`,
        [memberId1, memberId2, limit, offset]
    );
    return res.rows;
};

// Mark messages as read
module.exports.markMessagesRead = async (receiverId, senderId) => {
    await pool.query(
        `UPDATE portal_messages SET read = TRUE
         WHERE receiver_id = $1 AND sender_id = $2 AND read = FALSE`,
        [receiverId, senderId]
    );
};

// Get chat contacts for a member (latest message per contact)
module.exports.getChatContacts = async (memberId) => {
    const res = await pool.query(
        `SELECT DISTINCT ON (contact_id)
                contact_id,
                contact_name,
                contact_avatar,
                last_message,
                last_message_time,
                unread_count
         FROM (
             SELECT
                 CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS contact_id,
                 CASE WHEN m.sender_id = $1 THEN r.name ELSE s.name END AS contact_name,
                 CASE WHEN m.sender_id = $1 THEN r.profile_photo_url ELSE s.profile_photo_url END AS contact_avatar,
                 m.content AS last_message,
                 m.created_at AS last_message_time,
                 (SELECT COUNT(*) FROM portal_messages
                  WHERE sender_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
                    AND receiver_id = $1
                    AND read = FALSE) AS unread_count
             FROM portal_messages m
             JOIN members s ON s.membership_no = m.sender_id
             JOIN members r ON r.membership_no = m.receiver_id
             WHERE m.sender_id = $1 OR m.receiver_id = $1
             ORDER BY m.created_at DESC
         ) sub
         ORDER BY contact_id, last_message_time DESC`,
        [memberId]
    );
    return res.rows;
};


// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════

// Create a notification
module.exports.createNotification = async (memberId, type, actorId, message, postId = null) => {
    const res = await pool.query(
        `INSERT INTO portal_notifications (member_id, type, actor_id, message, post_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [memberId, type, actorId, message, postId]
    );
    return res.rows[0];
};

// Get notifications for a member
module.exports.getNotifications = async (memberId, limit = 30) => {
    const res = await pool.query(
        `SELECT n.*,
                a.name AS actor_name,
                a.profile_photo_url AS actor_avatar
         FROM portal_notifications n
         LEFT JOIN members a ON a.membership_no = n.actor_id
         WHERE n.member_id = $1
         ORDER BY n.created_at DESC
         LIMIT $2`,
        [memberId, limit]
    );
    return res.rows;
};

// Mark single notification as read
module.exports.markNotificationRead = async (notificationId, memberId) => {
    const res = await pool.query(
        `UPDATE portal_notifications SET read = TRUE
         WHERE id = $1 AND member_id = $2
         RETURNING *`,
        [notificationId, memberId]
    );
    return res.rows[0];
};

// Mark all notifications as read
module.exports.markAllNotificationsRead = async (memberId) => {
    await pool.query(
        `UPDATE portal_notifications SET read = TRUE
         WHERE member_id = $1 AND read = FALSE`,
        [memberId]
    );
};

// Count unread notifications
module.exports.getUnreadNotificationCount = async (memberId) => {
    const res = await pool.query(
        `SELECT COUNT(*) as count FROM portal_notifications
         WHERE member_id = $1 AND read = FALSE`,
        [memberId]
    );
    return parseInt(res.rows[0].count, 10);
};
