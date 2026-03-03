const pool = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');

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

    // Decrypt sensitive data if exists
    if (member.aadhar_no) {
        member.aadhar_no = decrypt(member.aadhar_no);
    }

    const inputMobile = (mobile || '').replace(/\D/g, '').slice(-10);
    if (!inputMobile) return null;

    let matchedUser = null;

    // Check head of family mobile
    const dbMobile = (member.mobile || '').replace(/\D/g, '').slice(-10);
    if (dbMobile === inputMobile) {
        matchedUser = { name: member.name, relation: 'Self/Head', mobile: member.mobile || '', profile_photo_url: member.profile_photo_url || null, gender: member.head_gender || null };
    }

    // Check family members
    if (!matchedUser && Array.isArray(member.family_members)) {
        for (const fm of member.family_members) {
            const fmMobile = (fm.mobile || '').replace(/\D/g, '').slice(-10);
            const fmAge = Number(fm.age) || 0;
            // Also relaxed the strictly '>= 18' age requirement just in case age is missing or minor needs to login
            if (fmMobile === inputMobile) {
                matchedUser = { name: fm.name, relation: fm.relation, mobile: fm.mobile || '', profile_photo_url: fm.profile_photo_url || null, gender: fm.gender || null };
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
 * Update an individual family member's profile photo within the family_members JSONB array.
 */
exports.updateFamilyMemberPhoto = async (membershipNo, mobile, photoUrl) => {
    const res = await pool.query('SELECT family_members, mobile FROM members WHERE membership_no = $1', [membershipNo]);
    if (res.rows.length === 0) return null;

    let { family_members, mobile: headMobile } = res.rows[0];
    const cleanHeadMobile = (headMobile || '').replace(/\D/g, '');
    const cleanTargetMobile = (mobile || '').replace(/\D/g, '');

    if (cleanHeadMobile === cleanTargetMobile) {
        // It's the head
        await pool.query('UPDATE members SET profile_photo_url = $1 WHERE membership_no = $2', [photoUrl, membershipNo]);
        return photoUrl;
    }

    if (Array.isArray(family_members)) {
        let updated = false;
        const newFamilyMembers = family_members.map(fm => {
            if ((fm.mobile || '').replace(/\D/g, '') === cleanTargetMobile) {
                updated = true;
                return { ...fm, profile_photo_url: photoUrl };
            }
            return fm;
        });

        if (updated) {
            await pool.query('UPDATE members SET family_members = $1 WHERE membership_no = $2', [JSON.stringify(newFamilyMembers), membershipNo]);
            return photoUrl;
        }
    }
    return null;
};

exports.saveOtp = async (membershipNo, mobile, otp) => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    await pool.query(
        `INSERT INTO portal_otps (membership_no, mobile, otp_code, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [membershipNo, mobile, otp, expiresAt]
    );
};

exports.verifyOtpCode = async (membershipNo, mobile, otp) => {
    const res = await pool.query(
        `SELECT id, expires_at FROM portal_otps 
         WHERE membership_no = $1 AND mobile = $2 AND otp_code = $3 
         ORDER BY created_at DESC LIMIT 1`,
        [membershipNo, mobile, otp]
    );
    const record = res.rows[0];
    if (!record) return false;

    if (new Date() > record.expires_at) return false; // Expired

    // Delete used OTP
    await pool.query(`DELETE FROM portal_otps WHERE id = $1`, [record.id]);
    return true;
};

/**
 * Get member profile by membership_no (full details for logged-in member)
 */
exports.getMemberProfile = async (membershipNo) => {
    const res = await pool.query(
        `SELECT * FROM members WHERE membership_no = $1`,
        [membershipNo]
    );
    const member = res.rows[0];
    if (member && member.aadhar_no) {
        member.aadhar_no = decrypt(member.aadhar_no);
    }
    return member || null;
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
            // Encrypt if field is aadhar_no
            if (field === 'aadhar_no' && data[field]) {
                vals.push(encrypt(data[field]));
            } else if (field === 'family_members' && typeof data[field] !== 'string') {
                // family_members is JSONB, need to stringify if it's an object/array
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
exports.createPost = async ({ authorId, textContent, images, location, authorName, authorPhoto, authorMobile }) => {
    const res = await pool.query(
        `INSERT INTO portal_posts (author_id, text_content, images, location, author_name, author_photo, author_mobile)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [authorId, textContent || null, images || [], location || null, authorName || null, authorPhoto || null, authorMobile || null]
    );
    return res.rows[0];
};

exports.getPosts = async ({ page = 1, limit = 20, membershipNo = null, mobile = null }) => {
    const offset = (page - 1) * limit;
    const res = await pool.query(
        `SELECT p.*,
            COALESCE(
              (SELECT (f->>'name')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = p.author_name LIMIT 1),
              p.author_name,
              m.name
            ) AS author_name,
            REPLACE(COALESCE(
              (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = p.author_name LIMIT 1),
              m.profile_photo_url
            ), 'drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') AS author_photo,
            m.village AS author_village,
            m.district AS author_district,
            EXISTS(
              SELECT 1 FROM portal_likes l
              WHERE l.post_id = p.id AND l.member_id = $3 AND l.member_mobile = $4
            ) AS liked_by_me,
            (SELECT COUNT(*) FROM portal_comments c WHERE c.post_id = p.id) AS comments_count
     FROM portal_posts p
     JOIN members m ON m.membership_no = p.author_id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
        [limit, offset, membershipNo || '', mobile || '']
    );
    return res.rows;
};

/**
 * Get single post with author data
 */
exports.getPost = async (postId, membershipNo, mobile) => {
    const res = await pool.query(
        `SELECT p.*,
            COALESCE(
              (SELECT (f->>'name')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = p.author_name LIMIT 1),
              p.author_name,
              m.name
            ) AS author_name,
            REPLACE(COALESCE(
              (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = p.author_name LIMIT 1),
              m.profile_photo_url
            ), 'drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') AS author_photo,
            m.village AS author_village,
            m.district AS author_district,
            EXISTS(
              SELECT 1 FROM portal_likes l
              WHERE l.post_id = p.id AND l.member_id = $2 AND l.member_mobile = $3
            ) AS liked_by_me,
            (SELECT COUNT(*) FROM portal_comments c WHERE c.post_id = p.id) AS comments_count
     FROM portal_posts p
     JOIN members m ON m.membership_no = p.author_id
     WHERE p.id = $1`,
        [postId, membershipNo || '', mobile || '']
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
        `CREATE TABLE IF NOT EXISTS portal_reports (
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
exports.toggleLike = async (postId, memberId, memberMobile) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the post row
        await client.query(
            `SELECT id FROM portal_posts WHERE id = $1 FOR UPDATE`,
            [postId]
        );

        // Check if already liked
        const existing = await client.query(
            `SELECT id FROM portal_likes WHERE post_id = $1 AND member_id = $2 AND member_mobile = $3`,
            [postId, memberId, memberMobile]
        );

        let liked;
        if (existing.rows.length > 0) {
            // Unlike
            await client.query(
                `DELETE FROM portal_likes WHERE post_id = $1 AND member_id = $2 AND member_mobile = $3`,
                [postId, memberId, memberMobile]
            );
            await client.query(
                `UPDATE portal_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
                [postId]
            );
            liked = false;
        } else {
            // Like
            await client.query(
                `INSERT INTO portal_likes (post_id, member_id, member_mobile) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [postId, memberId, memberMobile]
            );
            await client.query(
                `UPDATE portal_posts SET likes_count = likes_count + 1 WHERE id = $1`,
                [postId]
            );
            liked = true;
        }

        // Get updated count
        const countRes = await client.query(
            `SELECT likes_count, author_id, author_mobile FROM portal_posts WHERE id = $1`,
            [postId]
        );

        const likes_count = countRes.rows[0]?.likes_count || 0;
        const authorId = countRes.rows[0]?.author_id;
        const authorMobile = countRes.rows[0]?.author_mobile;

        if (liked && authorId && (authorId !== memberId || (authorMobile && authorMobile !== memberMobile))) {
            // Notify the author
            await client.query(
                `INSERT INTO portal_notifications (recipient_id, recipient_mobile, actor_id, actor_mobile, type, post_id, message) 
                 VALUES ($1, $2, $3, $4, 'like', $5, $6)`,
                [authorId, authorMobile, memberId, memberMobile, postId, `liked your post`]
            );
        }

        await client.query('COMMIT');
        return { liked, likes_count };
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
exports.addComment = async (postId, memberId, text, commenterName, commenterPhoto, commenterMobile, parentId = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(
            `INSERT INTO portal_comments (post_id, member_id, text, author_name, author_photo, author_mobile, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [postId, memberId, text, commenterName || null, commenterPhoto || null, commenterMobile || null, parentId]
        );

        await client.query(
            `UPDATE portal_posts SET comments_count = comments_count + 1 WHERE id = $1`,
            [postId]
        );

        await client.query('COMMIT');

        // Fetch with author name
        const commentWithAuthor = await client.query(
            `SELECT c.*, 
                COALESCE(
                  (SELECT (f->>'name')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = c.author_name LIMIT 1),
                  c.author_name,
                  m.name
                ) AS author_name,
                REPLACE(COALESCE(
                  (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = c.author_name LIMIT 1),
                  m.profile_photo_url
                ), 'drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') AS author_photo
       FROM portal_comments c
       JOIN members m ON m.membership_no = c.member_id
       WHERE c.id = $1`,
            [res.rows[0].id]
        );

        // Fetch post author for notification
        const postRes = await client.query('SELECT author_id, author_mobile FROM portal_posts WHERE id = $1', [postId]);
        const postAuthorId = postRes.rows[0]?.author_id;
        const postAuthorMobile = postRes.rows[0]?.author_mobile;

        if (postAuthorId && (postAuthorId !== memberId || (postAuthorMobile && postAuthorMobile !== commenterMobile))) {
            const textSnippet = text.length > 30 ? text.substring(0, 30) + '...' : text;
            await client.query(
                `INSERT INTO portal_notifications(recipient_id, recipient_mobile, actor_id, actor_mobile, type, post_id, message) 
                 VALUES($1, $2, $3, $4, 'comment', $5, $6)`,
                [postAuthorId, postAuthorMobile, memberId, commenterMobile, postId, `commented: "${textSnippet}"`]
            );
        }

        return commentWithAuthor.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Toggle like for a comment
 */
exports.toggleLikeComment = async (commentId, memberId, memberMobile) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if already liked
        const check = await client.query(
            'SELECT id FROM portal_comment_likes WHERE comment_id = $1 AND member_id = $2 AND member_mobile = $3',
            [commentId, memberId, memberMobile]
        );

        let liked = true;

        if (check.rows.length > 0) {
            // Unlike
            await client.query(
                'DELETE FROM portal_comment_likes WHERE comment_id = $1 AND member_id = $2 AND member_mobile = $3',
                [commentId, memberId, memberMobile]
            );
            await client.query(
                'UPDATE portal_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1',
                [commentId]
            );
            liked = false;
        } else {
            // Like
            await client.query(
                'INSERT INTO portal_comment_likes (comment_id, member_id, member_mobile) VALUES ($1, $2, $3)',
                [commentId, memberId, memberMobile]
            );
            await client.query(
                'UPDATE portal_comments SET likes_count = likes_count + 1 WHERE id = $1',
                [commentId]
            );
            liked = true;
        }

        const stats = await client.query('SELECT likes_count FROM portal_comments WHERE id = $1', [commentId]);

        await client.query('COMMIT');

        return { liked, likes_count: parseInt(stats.rows[0].likes_count) };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Get comments for a post based on parent_id and pagination
 */
exports.getComments = async (postId, memberId, memberMobile, parentId = null, page = 1, limit = 5) => {
    const offset = (page - 1) * limit;

    // We check if parentId is null or a true id string
    const parentCondition = parentId ? `c.parent_id = $4` : `c.parent_id IS NULL`;
    const params = [postId, memberId || '', memberMobile || ''];
    if (parentId) params.push(parentId);

    const res = await pool.query(
        `SELECT c.*,
            COALESCE(
              (SELECT (f->>'name')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = c.author_name LIMIT 1),
              c.author_name,
              m.name
            ) AS author_name,
            REPLACE(COALESCE(
              (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'name')::text = c.author_name LIMIT 1),
              m.profile_photo_url
            ), 'drive.google.com/uc?id=', 'lh3.googleusercontent.com/d/') AS author_photo,
            EXISTS(
              SELECT 1 FROM portal_comment_likes l
              WHERE l.comment_id = c.id AND l.member_id = $2 AND l.member_mobile = $3
            ) AS liked_by_me,
            (SELECT COUNT(*) FROM portal_comments r WHERE r.parent_id = c.id) AS replies_count
     FROM portal_comments c
     JOIN members m ON m.membership_no = c.member_id
     WHERE c.post_id = $1 AND ${parentCondition}
     ORDER BY c.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
    );

    // Also get total count for this level to power the "View More" button
    const countQuery = parentId
        ? `SELECT COUNT(*) as total FROM portal_comments c WHERE c.post_id = $1 AND c.parent_id = $2`
        : `SELECT COUNT(*) as total FROM portal_comments c WHERE c.post_id = $1 AND c.parent_id IS NULL`;

    const countParams = parentId ? [postId, parentId] : [postId];

    const countRes = await pool.query(countQuery, countParams);

    return {
        comments: res.rows,
        total: parseInt(countRes.rows[0].total, 10),
        page,
        limit
    };
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
        `INSERT INTO portal_photos(member_id, url, caption)
     VALUES($1, $2, $3)
     RETURNING * `,
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
        `DELETE FROM portal_photos WHERE id = $1 AND member_id = $2 RETURNING * `,
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
exports.toggleSubscription = async (followerId, followerMobile, followingId, followingMobile) => {
    if (followerId === followingId && followerMobile === followingMobile) {
        throw new Error('Cannot subscribe to yourself');
    }

    const existing = await pool.query(
        `SELECT id FROM portal_subscriptions WHERE follower_id = $1 AND follower_mobile = $2 AND following_id = $3 AND following_mobile = $4`,
        [followerId, followerMobile, followingId, followingMobile]
    );

    if (existing.rows.length > 0) {
        await pool.query(
            `DELETE FROM portal_subscriptions WHERE follower_id = $1 AND follower_mobile = $2 AND following_id = $3 AND following_mobile = $4`,
            [followerId, followerMobile, followingId, followingMobile]
        );
        return { subscribed: false };
    } else {
        await pool.query(
            `INSERT INTO portal_subscriptions(follower_id, follower_mobile, following_id, following_mobile) VALUES($1, $2, $3, $4)`,
            [followerId, followerMobile, followingId, followingMobile]
        );

        // Notify
        await pool.query(
            `INSERT INTO portal_notifications(recipient_id, recipient_mobile, actor_id, actor_mobile, type, message) 
             VALUES($1, $2, $3, $4, 'follow', $5)`,
            [followingId, followingMobile, followerId, followerMobile, `started following you`]
        );

        return { subscribed: true };
    }
};

/**
 * Get a member's subscriptions (who they follow)
 */
exports.getSubscriptions = async (memberId, memberMobile) => {
    const res = await pool.query(
        `SELECT s.following_id, s.following_mobile, m.name, m.village, m.district, head_fm.profile_photo_url, m.membership_no
     FROM portal_subscriptions s
     JOIN members m ON m.membership_no = s.following_id
     LEFT JOIN LATERAL (
        SELECT COALESCE(
            (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(m.family_members) f WHERE (f->>'mobile')::text = s.following_mobile),
            m.profile_photo_url
        ) as profile_photo_url
     ) head_fm ON true
     WHERE s.follower_id = $1 AND s.follower_mobile = $2
     ORDER BY s.created_at DESC`,
        [memberId, memberMobile]
    );
    return res.rows;
};

/**
 * Get followers of a member
 */
exports.getFollowers = async (memberId, memberMobile) => {
    const res = await pool.query(
        `SELECT s.follower_id as id, s.follower_mobile, m.name, m.village, m.district, head_fm.profile_photo_url, m.membership_no
     FROM portal_subscriptions s
     JOIN members m ON m.membership_no = s.follower_id
     LEFT JOIN LATERAL (
        SELECT COALESCE(
            (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(m.family_members) f WHERE (f->>'mobile')::text = s.follower_mobile),
            m.profile_photo_url
        ) as profile_photo_url
     ) head_fm ON true
     WHERE s.following_id = $1 AND s.following_mobile = $2
     ORDER BY s.created_at DESC`,
        [memberId, memberMobile]
    );
    return res.rows;
};

// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════

// Create a notification
module.exports.createNotification = async (recipientId, type, actorId, message, postId = null, actorName = null, recipientMobile = null, actorMobile = null) => {
    const res = await pool.query(
        `INSERT INTO portal_notifications(recipient_id, recipient_mobile, type, actor_id, actor_mobile, message, post_id, actor_name)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING * `,
        [recipientId, recipientMobile, type, actorId, actorMobile, message, postId, actorName]
    );
    return res.rows[0];
};

exports.getNotifications = async (memberId, memberMobile) => {
    const res = await pool.query(
        `SELECT n.id, n.type, COALESCE(n.actor_name, m.name) AS "actorName", 
            COALESCE(
                (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(COALESCE(m.family_members, '[]'::jsonb)) f WHERE (f->>'mobile')::text = n.actor_mobile),
                m.profile_photo_url
            ) AS "actorAvatar",
            n.message, n.created_at AS timestamp, n.is_read AS read, n.post_id AS "postId"
         FROM portal_notifications n
         JOIN members m ON m.membership_no = n.actor_id
         WHERE n.recipient_id = $1 AND n.recipient_mobile = $2
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [memberId, memberMobile]
    );
    // Standardize IDs to string for frontend compatibility
    return res.rows.map(r => ({ ...r, id: String(r.id) }));
};

exports.getUnreadNotificationCount = async (memberId, memberMobile) => {
    const res = await pool.query(
        `SELECT COUNT(*) FROM portal_notifications WHERE recipient_id = $1 AND recipient_mobile = $2 AND is_read = FALSE`,
        [memberId, memberMobile]
    );
    return parseInt(res.rows[0].count, 10);
};

exports.markNotificationRead = async (id, memberId, memberMobile) => {
    const res = await pool.query(
        `UPDATE portal_notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2 AND recipient_mobile = $3 RETURNING * `,
        [id, memberId, memberMobile]
    );
    return res.rows[0];
};

exports.markAllNotificationsRead = async (memberId, memberMobile) => {
    await pool.query(
        `UPDATE portal_notifications SET is_read = TRUE WHERE recipient_id = $1 AND recipient_mobile = $2`,
        [memberId, memberMobile]
    );
};

exports.deleteNotification = async (id, memberId, memberMobile) => {
    await pool.query(
        `DELETE FROM portal_notifications WHERE id = $1 AND recipient_id = $2 AND recipient_mobile = $3`,
        [id, memberId, memberMobile]
    );
};

/**
 * Get members with server-side search + filters + pagination.
 * All filtering is done in SQL — safe for 6k+ rows.
 */
exports.getMembersWithSubscription = async (
    currentMemberId, currentMemberMobile,
    page = 1, limit = 30,
    { search = '', district = '', village = '', gender = '', hasMobile = false } = {}
) => {
    const offset = (page - 1) * limit;
    const params = [currentMemberId, currentMemberMobile];
    const conditions = [
        `m.membership_no != $1`,
        `(m.is_banned IS NULL OR m.is_banned = false)`
    ];

    if (hasMobile) {
        conditions.push(`COALESCE(TRIM(m.mobile), '') != ''`);
    }

    if (hasMobile) {
        conditions.push(`COALESCE(TRIM(m.mobile), '') != ''`);
    }

    if (search) {
        params.push(`%${search}%`);
        const idx = params.length;
        conditions.push(
            `(m.name ILIKE $${idx} OR m.membership_no ILIKE $${idx} OR m.village ILIKE $${idx} OR m.mobile ILIKE $${idx})`
        );
    }
    if (district) {
        params.push(district);
        conditions.push(`m.district = $${params.length}`);
    }
    if (village) {
        params.push(village);
        conditions.push(`m.village = $${params.length}`);
    }
    if (gender === 'female') {
        conditions.push(`LOWER(m.head_gender) IN ('female', 'f')`);
    } else if (gender === 'male') {
        conditions.push(`LOWER(m.head_gender) NOT IN ('female', 'f')`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const sql = `
        SELECT m.membership_no, m.name, m.village, m.district, m.taluka, m.panchayat,
               m.mobile, m.head_gender, m.male, m.female,
               m.family_members, m.profile_photo_url,
               m.address, m.last_portal_login,
               EXISTS(
                   SELECT 1 FROM portal_subscriptions s
                   WHERE s.follower_id = $1 AND s.follower_mobile = $2 AND s.following_id = m.membership_no
               ) AS is_subscribed
        FROM members m
        WHERE ${where}
        ORDER BY m.name
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const res = await pool.query(sql, params);
    return res.rows;
};

/**
 * Get total count matching filters (for pagination display)
 */
exports.getMembersCount = async (
    currentMemberId,
    { search = '', district = '', village = '', gender = '', hasMobile = false } = {}
) => {
    const params = [currentMemberId];
    const conditions = [
        `m.membership_no != $1`,
        `(m.is_banned IS NULL OR m.is_banned = false)`
    ];

    if (hasMobile) {
        conditions.push(`COALESCE(TRIM(m.mobile), '') != ''`);
    }

    if (hasMobile) {
        conditions.push(`COALESCE(TRIM(m.mobile), '') != ''`);
    }

    if (search) {
        params.push(`%${search}%`);
        const idx = params.length;
        conditions.push(
            `(m.name ILIKE $${idx} OR m.membership_no ILIKE $${idx} OR m.village ILIKE $${idx} OR m.mobile ILIKE $${idx})`
        );
    }
    if (district) {
        params.push(district);
        conditions.push(`m.district = $${params.length}`);
    }
    if (village) {
        params.push(village);
        conditions.push(`m.village = $${params.length}`);
    }
    if (gender === 'female') {
        conditions.push(`LOWER(m.head_gender) IN ('female', 'f')`);
    } else if (gender === 'male') {
        conditions.push(`LOWER(m.head_gender) NOT IN ('female', 'f')`);
    }

    const where = conditions.join(' AND ');
    const res = await pool.query(
        `SELECT COUNT(*) AS total FROM members m WHERE ${where}`,
        params
    );
    return parseInt(res.rows[0].total, 10);
};

/**
 * Get distinct districts (and optionally villages for a district) for filter dropdowns
 */
exports.getMemberFilterOptions = async () => {
    const res = await pool.query(
        `SELECT DISTINCT district, village FROM members
         WHERE district IS NOT NULL AND district != ''
         ORDER BY district, village`
    );
    const districtMap = {};
    for (const row of res.rows) {
        if (!districtMap[row.district]) districtMap[row.district] = [];
        if (row.village) districtMap[row.district].push(row.village);
    }
    return districtMap;
};



// ═══════════════════════════════════════════════════
//  DIRECT MESSAGES (CHAT)
// ═══════════════════════════════════════════════════

// Save a message
module.exports.saveMessage = async (senderId, senderMobile, receiverId, receiverMobile, content, type = 'text') => {
    const res = await pool.query(
        `INSERT INTO portal_messages(sender_id, sender_mobile, receiver_id, receiver_mobile, content, type)
         VALUES($1, $2, $3, $4, $5, $6)
         RETURNING * `,
        [senderId, senderMobile, receiverId, receiverMobile || null, content, type]
    );
    return res.rows[0];
};

// Get conversation between two members
module.exports.getConversation = async (memberId1, mobile1, memberId2, mobile2, limit = 50, offset = 0) => {
    const res = await pool.query(
        `SELECT m.*,
            s.name AS sender_name,
            COALESCE(
                 (SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(s.family_members) f WHERE (f->>'mobile')::text = m.sender_mobile),
                 s.profile_photo_url
            ) AS sender_avatar,
            r.name AS receiver_name
         FROM portal_messages m
         JOIN members s ON s.membership_no = m.sender_id
         JOIN members r ON r.membership_no = m.receiver_id
         WHERE((m.sender_id = $1 AND m.sender_mobile = $2 AND m.receiver_id = $3 AND m.receiver_mobile = $4)
            OR(m.sender_id = $3 AND m.sender_mobile = $4 AND m.receiver_id = $1 AND m.receiver_mobile = $2))
         ORDER BY m.created_at ASC
         LIMIT $5 OFFSET $6`,
        [memberId1, mobile1, memberId2, mobile2 || '', limit, offset]
    );
    return res.rows;
};

// Mark messages as read
module.exports.markMessagesRead = async (receiverId, receiverMobile, senderId, senderMobile) => {
    await pool.query(
        `UPDATE portal_messages SET read = TRUE
         WHERE receiver_id = $1 AND receiver_mobile = $2 AND sender_id = $3 AND sender_mobile = $4 AND read = FALSE`,
        [receiverId, receiverMobile, senderId, senderMobile || '']
    );
};

// Get chat contacts for a member (latest message per contact)
module.exports.getChatContacts = async (memberId, memberMobile) => {
    // Optimized single-pass query with aggregation for unread counts
    const res = await pool.query(
        `WITH latest_messages AS (
            SELECT DISTINCT ON (
                LEAST(sender_id || '-' || COALESCE(sender_mobile,''), receiver_id || '-' || COALESCE(receiver_mobile,'')),
                GREATEST(sender_id || '-' || COALESCE(sender_mobile,''), receiver_id || '-' || COALESCE(receiver_mobile,''))
            ) 
            m.*,
            CASE WHEN m.sender_id = $1 AND m.sender_mobile = $2 THEN m.receiver_id ELSE m.sender_id END AS contact_id,
            CASE WHEN m.sender_id = $1 AND m.sender_mobile = $2 THEN m.receiver_mobile ELSE m.sender_mobile END AS contact_mobile,
            CASE WHEN m.sender_id = $1 AND m.sender_mobile = $2 THEN r.name ELSE s.name END AS contact_name,
            CASE WHEN (m.sender_id = $1 AND m.sender_mobile = $2) THEN
                COALESCE((SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(r.family_members) f WHERE (f->>'mobile')::text = m.receiver_mobile), r.profile_photo_url)
            ELSE
                COALESCE((SELECT (f->>'profile_photo_url')::text FROM jsonb_array_elements(s.family_members) f WHERE (f->>'mobile')::text = m.sender_mobile), s.profile_photo_url)
            END AS contact_avatar
            FROM portal_messages m
            JOIN members s ON s.membership_no = m.sender_id
            JOIN members r ON r.membership_no = m.receiver_id
            WHERE (m.sender_id = $1 AND m.sender_mobile = $2) OR (m.receiver_id = $1 AND m.receiver_mobile = $2)
            ORDER BY 
                LEAST(sender_id || '-' || COALESCE(sender_mobile,''), receiver_id || '-' || COALESCE(receiver_mobile,'')),
                GREATEST(sender_id || '-' || COALESCE(sender_mobile,''), receiver_id || '-' || COALESCE(receiver_mobile,'')),
                m.created_at DESC
        ),
        unread_counts AS (
            SELECT 
                sender_id AS contact_id, 
                sender_mobile AS contact_mobile, 
                COUNT(*) as count
            FROM portal_messages
            WHERE receiver_id = $1 AND receiver_mobile = $2 AND read = FALSE
            GROUP BY sender_id, sender_mobile
        )
        SELECT 
            lm.contact_id, 
            lm.contact_mobile, 
            lm.contact_name, 
            lm.contact_avatar, 
            lm.content AS last_message, 
            lm.created_at AS last_message_time,
            COALESCE(uc.count, 0) AS unread_count
        FROM latest_messages lm
        LEFT JOIN unread_counts uc ON lm.contact_id = uc.contact_id AND lm.contact_mobile = uc.contact_mobile
        ORDER BY last_message_time DESC`,
        [memberId, memberMobile]
    );
    return res.rows;
};

/**
 * Get Public Profile data (Name, Relation, Posts, Followers) efficiently
 */
exports.getPublicProfileData = async (membershipNo, name, viewerNo, viewerMobile) => {
    const res = await pool.query(
        `SELECT * FROM members WHERE membership_no = $1`,
        [membershipNo]
    );
    const member = res.rows[0];
    if (!member) return null;

    let targetMobile = '';
    let targetName = '';
    let targetAvatar = null;
    let targetGender = null;
    let relation = '';
    let isHoF = false;

    const normReqName = (name || '').toLowerCase().trim();
    const normMemName = (member.name || '').toLowerCase().trim();

    if (!normReqName || normReqName === normMemName) {
        isHoF = true;
        targetMobile = member.mobile || '';
        targetName = member.name;
        targetAvatar = member.profile_photo_url;
        targetGender = member.head_gender;
        relation = 'Head of Family';
    } else {
        let foundFm = null;
        if (Array.isArray(member.family_members)) {
            foundFm = member.family_members.find(fm => (fm.name || '').toLowerCase().trim() === normReqName);
        }
        if (foundFm) {
            targetMobile = foundFm.mobile || '';
            targetName = foundFm.name;
            targetAvatar = foundFm.profile_photo_url;
            targetGender = foundFm.gender;
            relation = foundFm.relation;
        } else {
            isHoF = true;
            targetMobile = member.mobile || '';
            targetName = member.name;
            targetAvatar = member.profile_photo_url;
            targetGender = member.head_gender;
            relation = 'Head of Family';
        }
    }

    const postsRes = await pool.query(
        `SELECT p.*,
            COALESCE(p.author_name, $4) AS author_name,
            COALESCE(p.author_photo, $9) AS author_photo,
            $5 AS author_village,
            $6 AS author_district,
            EXISTS(
                SELECT 1 FROM portal_likes l
                WHERE l.post_id = p.id AND l.member_id = $7 AND l.member_mobile = $8
            ) AS liked_by_me,
            (SELECT COUNT(*) FROM portal_comments c WHERE c.post_id = p.id) AS comments_count
         FROM portal_posts p
         WHERE p.author_id = $1 AND (p.author_mobile = $2 OR p.author_name = $3)
         ORDER BY p.created_at DESC`,
        [membershipNo, targetMobile, targetName, targetName, member.village, member.district, viewerNo || '', viewerMobile || '', targetAvatar || null]
    );

    const followerRes = await pool.query(
        `SELECT COUNT(*) FROM portal_subscriptions WHERE following_id = $1 AND (following_mobile = $2 OR following_mobile = '')`,
        [membershipNo, targetMobile]
    );
    const followingRes = await pool.query(
        `SELECT COUNT(*) FROM portal_subscriptions WHERE follower_id = $1 AND (follower_mobile = $2 OR follower_mobile = '')`,
        [membershipNo, targetMobile]
    );

    let isFollowing = false;
    if (viewerNo && viewerMobile) {
        const checkFollow = await pool.query(
            `SELECT 1 FROM portal_subscriptions 
             WHERE follower_id = $1 AND follower_mobile = $2 AND following_id = $3 AND (following_mobile = $4 OR following_mobile = '')`,
            [viewerNo, viewerMobile, membershipNo, targetMobile]
        );
        isFollowing = checkFollow.rows.length > 0;
    }

    let familyList = [];
    familyList.push({
        id: member.membership_no,
        name: member.name,
        relation: 'Head of Family',
        gender: member.head_gender,
        avatar: member.profile_photo_url,
        isHoF: true
    });
    if (Array.isArray(member.family_members)) {
        member.family_members.forEach(fm => {
            familyList.push({
                id: member.membership_no,
                name: fm.name,
                relation: fm.relation,
                gender: fm.gender,
                avatar: fm.profile_photo_url,
                isHoF: false
            });
        });
    }

    // Process posts formatting
    const formattedPosts = await Promise.all(postsRes.rows.map(async p => {
        let comments = [];
        if (p.comments_count > 0) {
            const comRes = await pool.query(
                `SELECT c.*,
                    COALESCE(c.author_name, 'Unknown') AS author_name,
                    c.author_photo
                 FROM portal_comments c
                 WHERE c.post_id = $1
                 ORDER BY c.created_at ASC`,
                [p.id]
            );
            comments = comRes.rows.map(c => ({
                id: c.id,
                content: c.content,
                authorName: c.author_name,
                authorAvatar: c.author_photo,
                timestamp: c.created_at,
                likes: c.likes_count || 0
            }));
        }
        return {
            id: String(p.id),
            authorId: p.author_id,
            authorName: p.author_name,
            authorAvatar: p.author_photo,
            authorMobile: p.author_mobile,
            location: p.location || p.author_village || p.author_district,
            content: p.text_content || '',
            media: (p.images || []).map(url => ({ url, type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image' })),
            likes: p.likes_count || 0,
            reactions: p.reactions || { like: p.likes_count || 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
            myReaction: p.liked_by_me ? 'like' : null,
            comments: comments,
            timestamp: p.created_at,
            isLiked: p.liked_by_me,
            poll: p.poll_data ? p.poll_data : undefined
        };
    }));

    return {
        id: membershipNo,
        name: targetName,
        avatar: targetAvatar,
        gender: targetGender,
        relation,
        isHoF,
        village: member.village,
        district: member.district,
        familyId: membershipNo,
        hofName: member.name,
        address: isHoF ? member.address : undefined,
        maleCount: isHoF ? member.male : undefined,
        femaleCount: isHoF ? member.female : undefined,
        stats: {
            posts: formattedPosts.length,
            followers: parseInt(followerRes.rows[0].count),
            following: parseInt(followingRes.rows[0].count),
            familyMembers: familyList.length
        },
        family: familyList,
        posts: formattedPosts,
        isFollowing,
        joined: new Date(member.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };
};
