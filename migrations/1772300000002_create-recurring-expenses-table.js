/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.recurring_expenses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
            next_due_date DATE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_recurring_due_date ON recurring_expenses(next_due_date);
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.dropTable('recurring_expenses');
};
