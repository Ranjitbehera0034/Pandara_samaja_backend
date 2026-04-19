/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // 1. Add Category and Tags to content tables
    pgm.sql(`
        ALTER TABLE portal_posts 
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

        ALTER TABLE portal_reels
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);

    // 2. Enhance views log with duration and segments
    pgm.sql(`
        ALTER TABLE portal_video_views_log
        ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS segments_watched JSONB DEFAULT '[]'::jsonb;
    `);

    // 3. Create an index on segments and category for faster analytics
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_portal_posts_category ON portal_posts(category);
        CREATE INDEX IF NOT EXISTS idx_portal_reels_category ON portal_reels(category);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE portal_posts DROP COLUMN IF EXISTS category, DROP COLUMN IF EXISTS tags;
        ALTER TABLE portal_reels DROP COLUMN IF EXISTS category, DROP COLUMN IF EXISTS tags;
        ALTER TABLE portal_video_views_log DROP COLUMN IF EXISTS duration_seconds, DROP COLUMN IF EXISTS segments_watched;
    `);
};
