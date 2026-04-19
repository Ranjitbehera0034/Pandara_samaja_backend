/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // 1. Ensure portal_posts has views_count
    pgm.sql(`
        ALTER TABLE portal_posts 
        ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
    `);

    // 2. Create a unified video views log
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.portal_video_views_log (
            id              SERIAL PRIMARY KEY,
            video_type      VARCHAR(20) NOT NULL, -- 'post' or 'reel'
            video_id        INTEGER NOT NULL,

            -- Viewer info
            viewer_id       VARCHAR(100) NOT NULL,   -- membership_no or admin username
            viewer_type     VARCHAR(10) NOT NULL,    -- 'member' or 'admin'
            viewer_name     VARCHAR(255),
            viewer_mobile   VARCHAR(15),

            watched_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_vv_log_video    ON portal_video_views_log(video_type, video_id);
        CREATE INDEX IF NOT EXISTS idx_vv_log_viewer   ON portal_video_views_log(viewer_id, viewer_type);
        CREATE INDEX IF NOT EXISTS idx_vv_log_watched  ON portal_video_views_log(watched_at DESC);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS public.portal_video_views_log CASCADE;
        ALTER TABLE portal_posts DROP COLUMN IF EXISTS views_count;
    `);
};
