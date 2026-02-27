/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('whatsapp_logs', {
        id: 'id',
        message_id: { type: 'varchar(255)', notNull: true, unique: true },
        recipient_mobile: { type: 'varchar(15)', notNull: true },
        status: { type: 'varchar(50)', notNull: true, default: 'sent' }, // 'sent', 'delivered', 'read', 'failed'
        payload: { type: 'jsonb', default: '{}' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    // Index for quick lookups by message_id and recipient
    pgm.createIndex('whatsapp_logs', 'message_id');
    pgm.createIndex('whatsapp_logs', 'recipient_mobile');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('whatsapp_logs');
};
