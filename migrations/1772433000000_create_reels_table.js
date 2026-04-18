/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // 1. Reels Table
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.portal_reels (
            id SERIAL PRIMARY KEY,
            author_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
            author_mobile VARCHAR(15),
            author_name VARCHAR(100),
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            caption TEXT,
            music_name VARCHAR(100) DEFAULT 'Original Audio',
            views_count INTEGER DEFAULT 0,
            shares_count INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_portal_reels_author ON portal_reels(author_id);
        CREATE INDEX IF NOT EXISTS idx_portal_reels_created ON portal_reels(created_at DESC);
    `);

    // 2. Reel Likes Table
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.reel_likes (
            id SERIAL PRIMARY KEY,
            reel_id INTEGER NOT NULL REFERENCES portal_reels(id) ON DELETE CASCADE,
            member_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
            member_mobile VARCHAR(15),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(reel_id, member_id, member_mobile)
        );
        CREATE INDEX IF NOT EXISTS idx_reel_likes_reel ON reel_likes(reel_id);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS public.reel_likes CASCADE;
        DROP TABLE IF EXISTS public.portal_reels CASCADE;
    `);
};
