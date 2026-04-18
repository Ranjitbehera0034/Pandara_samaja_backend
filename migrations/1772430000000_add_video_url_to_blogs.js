/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumn('posts', {
        video_url: { type: 'text' }
    });
};

exports.down = pgm => {
    pgm.dropColumn('posts', 'video_url');
};
