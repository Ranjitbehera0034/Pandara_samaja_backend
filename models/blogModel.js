const db = require('../config/db');

exports.getAll = () => db.query('SELECT * FROM posts ORDER BY created_at DESC');

exports.create = ({ title, content }) =>
  db.query('INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *', [title, content]);

exports.remove = id => db.query('DELETE FROM posts WHERE id = $1', [id]);
