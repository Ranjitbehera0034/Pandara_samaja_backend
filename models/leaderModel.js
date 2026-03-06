const pool = require('../config/db');

class LeaderModel {
    static async findAll() {
        const result = await pool.query('SELECT * FROM leaders ORDER BY level, display_order, created_at ASC');
        return result.rows;
    }

    static async findByLevel(level) {
        const result = await pool.query('SELECT * FROM leaders WHERE level = $1 ORDER BY display_order, created_at ASC', [level]);
        return result.rows;
    }

    // Flexible filter: level and/or location (case-insensitive)
    static async findByFilter({ level, location } = {}) {
        const conditions = [];
        const params = [];
        if (level) {
            params.push(level);
            conditions.push(`LOWER(level) = LOWER($${params.length})`);
        }
        if (location) {
            params.push(location);
            conditions.push(`LOWER(location) = LOWER($${params.length})`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await pool.query(
            `SELECT * FROM leaders ${where} ORDER BY display_order, created_at ASC`,
            params
        );
        return result.rows;
    }

    // Get distinct location values for a given level (for frontend dropdowns)
    static async getLocationsByLevel(level) {
        const result = await pool.query(
            `SELECT DISTINCT location FROM leaders WHERE LOWER(level) = LOWER($1) AND location IS NOT NULL ORDER BY location ASC`,
            [level]
        );
        return result.rows.map(r => r.location);
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM leaders WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async create(data) {
        const { name, name_or, role, role_or, level, location, image_url, display_order } = data;
        const result = await pool.query(
            `INSERT INTO leaders (name, name_or, role, role_or, level, location, image_url, display_order) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, name_or || null, role, role_or || null, level, location || null, image_url || null, display_order || 0]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const { name, name_or, role, role_or, level, location, image_url, display_order } = data;
        const result = await pool.query(
            `UPDATE leaders 
             SET name = $1, name_or = $2, role = $3, role_or = $4, level = $5, location = $6, image_url = COALESCE($7, image_url), display_order = $8, updated_at = CURRENT_TIMESTAMP
             WHERE id = $9 RETURNING *`,
            [name, name_or || null, role, role_or || null, level, location || null, image_url || null, display_order || 0, id]
        );
        return result.rows[0] || null;
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM leaders WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = LeaderModel;
