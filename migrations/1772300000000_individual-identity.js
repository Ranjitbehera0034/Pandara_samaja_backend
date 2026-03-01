/**
 * migration: add mobile columns for individual family member identity
 */
exports.up = (pgm) => {
    // 1. portal_likes
    pgm.addColumn('portal_likes', {
        member_mobile: { type: 'VARCHAR(15)' }
    });
    // Update unique constraint
    pgm.sql('ALTER TABLE portal_likes DROP CONSTRAINT IF EXISTS portal_likes_post_id_member_id_key');
    pgm.addConstraint('portal_likes', 'portal_likes_post_id_member_id_member_mobile_key', {
        unique: ['post_id', 'member_id', 'member_mobile']
    });

    // 2. portal_subscriptions
    pgm.addColumn('portal_subscriptions', {
        follower_mobile: { type: 'VARCHAR(15)' },
        following_mobile: { type: 'VARCHAR(15)' }
    });
    // Update unique constraint
    pgm.sql('ALTER TABLE portal_subscriptions DROP CONSTRAINT IF EXISTS portal_subscriptions_follower_id_following_id_key');
    pgm.addConstraint('portal_subscriptions', 'portal_subscriptions_follower_id_follower_mobile_following_id_following_mobile_key', {
        unique: ['follower_id', 'follower_mobile', 'following_id', 'following_mobile']
    });

    // 3. portal_messages
    pgm.addColumn('portal_messages', {
        sender_mobile: { type: 'VARCHAR(15)' },
        receiver_mobile: { type: 'VARCHAR(15)' }
    });

    // 4. portal_notifications
    pgm.addColumn('portal_notifications', {
        recipient_mobile: { type: 'VARCHAR(15)' },
        actor_mobile: { type: 'VARCHAR(15)' }
    });
};

exports.down = (pgm) => {
    // Reverse changes
    pgm.dropColumn('portal_notifications', ['recipient_mobile', 'actor_mobile']);
    pgm.dropColumn('portal_messages', ['sender_mobile', 'receiver_mobile']);

    pgm.dropConstraint('portal_subscriptions', 'portal_subscriptions_follower_id_follower_mobile_following_id_following_mobile_key');
    pgm.dropColumn('portal_subscriptions', ['follower_mobile', 'following_mobile']);
    pgm.addConstraint('portal_subscriptions', 'portal_subscriptions_follower_id_following_id_key', {
        unique: ['follower_id', 'following_id']
    });

    pgm.dropConstraint('portal_likes', 'portal_likes_post_id_member_id_member_mobile_key');
    pgm.dropColumn('portal_likes', ['member_mobile']);
    pgm.addConstraint('portal_likes', 'portal_likes_post_id_member_id_key', {
        unique: ['post_id', 'member_id']
    });
};
