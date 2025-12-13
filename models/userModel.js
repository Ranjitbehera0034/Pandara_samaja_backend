const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class UserModel {
  // Find user by username
  static async findByUsername(username) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT id, username, role, created_at, last_login FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Create new user
  static async create(username, password, role = 'user') {
    try {
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await pool.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, username, role, created_at`,
        [username, password_hash, role]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  // Update last login time
  static async updateLastLogin(userId) {
    try {
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } catch (error) {
      throw error;
    }
  }

  // Update password
  static async updatePassword(userId, newPassword) {
    try {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [password_hash, userId]
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  static async delete(userId) {
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;
