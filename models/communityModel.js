const pool = require('../config/db');

// ═══════════════════════════════════════════════════
// COMMUNITY EVENTS
// ═══════════════════════════════════════════════════

exports.getEvents = async () => {
    const res = await pool.query(
        `SELECT e.*, COUNT(r.member_id) as rsvp_count, m.name as creator_name
         FROM portal_community_events e
         LEFT JOIN portal_community_event_rsvps r ON e.id = r.event_id
         LEFT JOIN members m ON e.created_by = m.membership_no
         GROUP BY e.id, m.name
         ORDER BY e.event_date ASC`
    );
    return res.rows;
};

exports.createEvent = async (title, description, eventDate, location, imageUrl, createdBy) => {
    const res = await pool.query(
        `INSERT INTO portal_community_events (title, description, event_date, location, image_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description, eventDate, location, imageUrl, createdBy]
    );
    return res.rows[0];
};

exports.rsvpEvent = async (eventId, memberId) => {
    await pool.query(
        `INSERT INTO portal_community_event_rsvps (event_id, member_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [eventId, memberId]
    );
};

// ═══════════════════════════════════════════════════
// COMMUNITY GROUPS
// ═══════════════════════════════════════════════════

exports.getGroups = async () => {
    const res = await pool.query(
        `SELECT g.*, COUNT(gm.member_id) as member_count
         FROM portal_community_groups g
         LEFT JOIN portal_community_group_members gm ON g.id = gm.group_id
         GROUP BY g.id
         ORDER BY g.created_at DESC`
    );
    return res.rows;
};

exports.createGroup = async (name, description, privacyLevel, createdBy) => {
    const res = await pool.query(
        `INSERT INTO portal_community_groups (name, description, privacy_level, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, description, privacyLevel, createdBy]
    );
    await pool.query(
        `INSERT INTO portal_community_group_members (group_id, member_id, role)
         VALUES ($1, $2, 'admin')`,
        [res.rows[0].id, createdBy]
    );
    return res.rows[0];
};

exports.joinGroup = async (groupId, memberId) => {
    // Determine if joining or leaving
    const existing = await pool.query(
        `SELECT 1 FROM portal_community_group_members WHERE group_id = $1 AND member_id = $2`,
        [groupId, memberId]
    );

    if (existing.rows.length > 0) {
        // Leave Group
        await pool.query(
            `DELETE FROM portal_community_group_members WHERE group_id = $1 AND member_id = $2`,
            [groupId, memberId]
        );
        return { joined: false };
    } else {
        // Join Group
        await pool.query(
            `INSERT INTO portal_community_group_members (group_id, member_id, role)
             VALUES ($1, $2, 'member')`,
            [groupId, memberId]
        );
        return { joined: true };
    }
};

// ═══════════════════════════════════════════════════
// EXPLORE STATS
// ═══════════════════════════════════════════════════

exports.getExploreStats = async () => {
    // Provide general stats: total members, total posts, general things
    const memRes = await pool.query(`SELECT COUNT(*) as active_members FROM members WHERE last_portal_login IS NOT NULL`);
    const postRes = await pool.query(`SELECT COUNT(*) as total_posts FROM portal_posts`);
    const groupRes = await pool.query(`SELECT COUNT(*) as total_groups FROM portal_community_groups`);

    return {
        activeMembers: parseInt(memRes.rows[0].active_members) || 0,
        totalPosts: parseInt(postRes.rows[0].total_posts) || 0,
        totalGroups: parseInt(groupRes.rows[0].total_groups) || 0,
        trendingTags: ['#festival', '#community', '#puja']
    };
};
