/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.expenses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            description TEXT,
            payee VARCHAR(255),
            expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
            attachment_url TEXT,
            recorded_by VARCHAR(50) NOT NULL REFERENCES users(username) ON UPDATE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_expenses_payee ON expenses(payee);
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.dropTable('expenses');
};
