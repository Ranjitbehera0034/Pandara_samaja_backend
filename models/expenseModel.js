const db = require('../config/db');

/**
 * Fetch all expenses with optional filtering
 */
exports.findAll = async ({ category, startDate, endDate, limit = 50, offset = 0 }) => {
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (category) {
        params.push(category);
        query += ` AND category = $${params.length}`;
    }

    if (startDate) {
        params.push(startDate);
        query += ` AND expense_date >= $${params.length}`;
    }

    if (endDate) {
        params.push(endDate);
        query += ` AND expense_date <= $${params.length}`;
    }

    query += ` ORDER BY expense_date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM expenses');
    
    return {
        rows: result.rows,
        total: parseInt(countResult.rows[0].count)
    };
};

exports.findById = (id) => db.query('SELECT * FROM expenses WHERE id = $1', [id]);

exports.create = ({ title, category, amount, description, payee, expense_date, attachment_url, recorded_by }) => {
    const query = `
        INSERT INTO expenses (title, category, amount, description, payee, expense_date, attachment_url, recorded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `;
    return db.query(query, [title, category, amount, description, payee, expense_date, attachment_url, recorded_by]);
};

exports.update = (id, data) => {
    const fields = [];
    const params = [];
    let i = 1;

    Object.keys(data).forEach(key => {
        if (['title', 'category', 'amount', 'description', 'payee', 'expense_date', 'attachment_url'].includes(key)) {
            fields.push(`${key} = $${i++}`);
            params.push(data[key]);
        }
    });

    if (fields.length === 0) return null;

    params.push(id);
    const query = `UPDATE expenses SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`;
    return db.query(query, params);
};

exports.remove = (id) => db.query('DELETE FROM expenses WHERE id = $1', [id]);

/**
 * Get summary statistics for dashboard
 */
exports.getStats = async () => {
    const monthlyQuery = `
        SELECT 
            TO_CHAR(expense_date, 'YYYY-MM') as month,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM expenses
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    `;

    const categoryQuery = `
        SELECT 
            category,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM expenses
        GROUP BY category
        ORDER BY total_amount DESC
    `;

    const dailyQuery = `
        SELECT 
            expense_date::date as date,
            SUM(amount) as total_amount
        FROM expenses
        WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date DESC
    `;

    const [monthly, category, daily] = await Promise.all([
        db.query(monthlyQuery),
        db.query(categoryQuery),
        db.query(dailyQuery)
    ]);

    return {
        monthly: monthly.rows,
        byCategory: category.rows,
        last30Days: daily.rows
    };
};
