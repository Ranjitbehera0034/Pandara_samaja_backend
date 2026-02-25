const pool = require('./config/db');

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leaders (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                level VARCHAR(50) NOT NULL,
                location VARCHAR(255),
                image_url TEXT,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table 'leaders' created or already exists.");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        pool.end();
    }
}

createTable();
