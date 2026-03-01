const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class UserModel {
  // Find user by username
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  // Find user by membership_no
  static async findByMembershipNo(membershipNo) {
    const result = await pool.query(
      'SELECT * FROM users WHERE membership_no = $1',
      [membershipNo]
    );
    return result.rows[0] || null;
  }

  // Find user by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, role, membership_no, real_name, email, created_at, last_login, mfa_secret, is_mfa_active FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Create new user
  static async create(username, password, role = 'user', membershipNo = null, realName = null, email = null) {
    try {
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await pool.query(
        `INSERT INTO users (username, password_hash, role, membership_no, real_name, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, role, membership_no, real_name, email, created_at`,
        [username, password_hash, role, membershipNo, realName, email]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Username already exists', { cause: error });
      }
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update last login time
  static async updateLastLogin(userId) {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  // Update password
  static async updatePassword(userId, newPassword) {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, userId]
    );

    return true;
  }

  // Delete user
  static async delete(userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }

  // Update MFA Secret
  static async updateMfaSecret(userId, secret) {
    await pool.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, userId]);
    return true;
  }

  // Activate MFA
  static async activateMfa(userId) {
    await pool.query('UPDATE users SET is_mfa_active = true WHERE id = $1', [userId]);
    return true;
  }

  // Get all administrative users
  static async getAllUsers() {
    const result = await pool.query(
      'SELECT id, username, role, membership_no, real_name, email, created_at, last_login, is_mfa_active FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }
}

module.exports = UserModel;
