const Post = require('../models/blogModel');
const gDrive = require('../config/googleDrive');

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
    let image_url = null;

    if (req.file) {
      image_url = await gDrive.uploadFile(req.file);
    }

    const { rows } = await Post.create({ title, content, image_url });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create Post Error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, content } = req.body;

    // Check if an existing Image URL was passed
    let image_url = req.body.existingImage || null;

    if (req.file) {
      image_url = await gDrive.uploadFile(req.file);
    } else if (!image_url) {
      // If no file and no existing image passed, get existing row and keep its image unless they explicitly removed it
      // Actually, if they didn't pass existingImage, see if they passed `removeImage=true`
      if (req.body.removeImage !== 'true') {
        const { rows: existingRows } = await Post.getOne(req.params.id);
        if (existingRows.length > 0) {
          image_url = existingRows[0].image_url;
        }
      }
    }

    const { rows } = await Post.update(req.params.id, { title, content, image_url });
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
