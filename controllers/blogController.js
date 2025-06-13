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

exports.remove = async (req, res) => {
  try {
    await Post.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Post Error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
