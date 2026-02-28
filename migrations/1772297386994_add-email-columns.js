/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // Add email column to members table
    pgm.addColumns('members', {
        email: { type: 'varchar(100)' }
    });

    // Add email column to users table (Admin accounts)
    pgm.addColumns('users', {
        email: { type: 'varchar(100)' }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropColumns('members', ['email']);
    pgm.dropColumns('users', ['email']);
};
