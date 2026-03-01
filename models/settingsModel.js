const pool = require('../config/db');

exports.getAllSettings = async () => {
    const result = await pool.query('SELECT setting_key, setting_value FROM global_settings');
    const settings = {};
    result.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
    });
    return settings;
};

exports.getSetting = async (key) => {
    const result = await pool.query('SELECT setting_value FROM global_settings WHERE setting_key = $1', [key]);
    if (result.rows.length > 0) {
        return result.rows[0].setting_value;
    }
    return null;
};

exports.updateSetting = async (key, value) => {
    const result = await pool.query(
        'INSERT INTO global_settings (setting_key, setting_value) VALUES ($1, $2::jsonb) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2::jsonb, updated_at = CURRENT_TIMESTAMP RETURNING *',
        [key, JSON.stringify(value)]
    );
    return result.rows[0];
};
