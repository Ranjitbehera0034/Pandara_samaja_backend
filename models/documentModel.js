const db = require('../config/db');

/**
 * Fetch all documents with optional filtering
 */
exports.findAll = async ({ category, uploadedBy, limit = 50, offset = 0 } = {}) => {
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params = [];

    if (category) {
        params.push(category);
        query += ` AND category = $${params.length}`;
    }

    if (uploadedBy) {
        params.push(uploadedBy);
        query += ` AND uploaded_by = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM documents');
    
    return {
        rows: result.rows,
        total: parseInt(countResult.rows[0].count)
    };
};

exports.findById = (id) => db.query('SELECT * FROM documents WHERE id = $1', [id]);

exports.create = ({ title, category, file_url, file_type, description, uploaded_by }) => {
    const query = `
        INSERT INTO documents (title, category, file_url, file_type, description, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    return db.query(query, [title, category, file_url, file_type, description, uploaded_by]);
};

exports.remove = (id) => db.query('DELETE FROM documents WHERE id = $1', [id]);
