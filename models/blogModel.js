const db = require('../config/db');

exports.getAll = () => db.query('SELECT * FROM posts ORDER BY created_at DESC');

exports.getOne = (id) => db.query('SELECT * FROM posts WHERE id = $1', [id]);

exports.create = ({ title, content, image_url, video_url }) =>
  db.query('INSERT INTO posts (title, content, image_url, video_url) VALUES ($1, $2, $3, $4) RETURNING *', [title, content, image_url, video_url]);

exports.update = (id, { title, content, image_url, video_url }) =>
  db.query('UPDATE posts SET title = $1, content = $2, image_url = $3, video_url = $4 WHERE id = $5 RETURNING *', [title, content, image_url, video_url, id]);

exports.remove = id => db.query('DELETE FROM posts WHERE id = $1', [id]);
