const Post = require('../models/blogModel');

exports.getAll = async (req, res) => {
  try {
    const { rows } = await Post.getAll();
    res.json(rows);
  } catch (err) {
    console.error('Get Posts Error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await Post.getOne(req.params.id);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get Post Error:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, content } = req.body;
    const { rows } = await Post.create({ title, content });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create Post Error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, content } = req.body;
    const { rows } = await Post.update(req.params.id, { title, content });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Update Post Error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

exports.remove = async (req, res) => {
  try {
    await Post.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Post Error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
