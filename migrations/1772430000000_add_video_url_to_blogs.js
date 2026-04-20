/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE posts 
        ADD COLUMN IF NOT EXISTS video_url TEXT;
    `);
};

exports.down = pgm => {
    pgm.dropColumn('posts', 'video_url');
};
