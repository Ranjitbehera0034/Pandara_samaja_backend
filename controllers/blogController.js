const Post = require('../models/blogModel');
const gDrive = require('../config/googleDrive');
exports.getAll = async (req, res, next) => {
  try {
    const {
      rows
    } = await Post.getAll();
    res.json({
      success: true,
      posts: rows
    });
  } catch (err) {
    console.error('Get Posts Error:', err);
    next(err);
  }
};
exports.getOne = async (req, res, next) => {
  try {
    const {
      rows
    } = await Post.getOne(req.params.id);
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get Post Error:', err);
    next(err);
  }
};
exports.create = async (req, res, next) => {
  try {
    const {
      title,
      content
    } = req.body;
    let image_url = null;
    if (req.file) {
      image_url = await gDrive.uploadFile(req.file);
    }
    const {
      rows
    } = await Post.create({
      title,
      content,
      image_url
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create Post Error:', err);
    next(err);
  }
};
exports.update = async (req, res, next) => {
  try {
    const {
      title,
      content
    } = req.body;

    // Check if an existing Image URL was passed
    let image_url = req.body.existingImage || null;
    if (req.file) {
      image_url = await gDrive.uploadFile(req.file);
    } else if (!image_url) {
      // If no file and no existing image passed, get existing row and keep its image unless they explicitly removed it
      // Actually, if they didn't pass existingImage, see if they passed `removeImage=true`
      if (req.body.removeImage !== 'true') {
        const {
          rows: existingRows
        } = await Post.getOne(req.params.id);
        if (existingRows.length > 0) {
          image_url = existingRows[0].image_url;
        }
      }
    }
    const {
      rows
    } = await Post.update(req.params.id, {
      title,
      content,
      image_url
    });
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Update Post Error:', err);
    next(err);
  }
};
exports.remove = async (req, res, next) => {
  try {
    await Post.remove(req.params.id);
    res.json({
      success: true
    });
  } catch (err) {
    console.error('Delete Post Error:', err);
    next(err);
  }
};