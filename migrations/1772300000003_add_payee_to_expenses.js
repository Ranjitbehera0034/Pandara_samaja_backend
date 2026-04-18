/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE public.expenses 
        ADD COLUMN IF NOT EXISTS payee VARCHAR(255);
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE public.expenses 
        DROP COLUMN IF EXISTS payee;
    `);
};
