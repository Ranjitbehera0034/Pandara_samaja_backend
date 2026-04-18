const db = require('../config/db');

exports.findAll = () => db.query('SELECT * FROM recurring_expenses WHERE is_active = TRUE ORDER BY next_due_date ASC');

exports.findDueSoon = (days = 7) => {
    return db.query(
        "SELECT * FROM recurring_expenses WHERE is_active = TRUE AND next_due_date <= CURRENT_DATE + ($1 * interval '1 day')",
        [days]
    );
};

exports.create = ({ title, category, amount, frequency, next_due_date }) => {
    const query = `
        INSERT INTO recurring_expenses (title, category, amount, frequency, next_due_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    return db.query(query, [title, category, amount, frequency, next_due_date]);
};

exports.updateNextDueDate = (id, frequency) => {
    const interval = frequency === 'yearly' ? '1 year' : '1 month';
    const query = `
        UPDATE recurring_expenses 
        SET next_due_date = next_due_date + interval '${interval}', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 
        RETURNING *
    `;
    return db.query(query, [id]);
};

exports.remove = (id) => db.query('DELETE FROM recurring_expenses WHERE id = $1', [id]);
