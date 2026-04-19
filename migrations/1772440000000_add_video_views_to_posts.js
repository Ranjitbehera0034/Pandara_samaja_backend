/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // 1. Add views_count column to posts (admin/superadmin announcements)
    pgm.sql(`
        ALTER TABLE posts
            ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
    `);

    // 2. Create viewer log table — one row per view event
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.post_video_views (
            id              SERIAL PRIMARY KEY,
            post_id         INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

            -- Who watched: a portal member OR an admin/superadmin
            viewer_type     VARCHAR(10) NOT NULL CHECK (viewer_type IN ('member', 'admin')),
            viewer_id       VARCHAR(100) NOT NULL,   -- membership_no or admin username
            viewer_name     VARCHAR(150),
            viewer_mobile   VARCHAR(15),

            watched_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_pvv_post    ON post_video_views(post_id);
        CREATE INDEX IF NOT EXISTS idx_pvv_viewer  ON post_video_views(viewer_id, viewer_type);
        CREATE INDEX IF NOT EXISTS idx_pvv_watched ON post_video_views(watched_at DESC);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS public.post_video_views CASCADE;
        ALTER TABLE posts DROP COLUMN IF EXISTS views_count;
    `);
};
