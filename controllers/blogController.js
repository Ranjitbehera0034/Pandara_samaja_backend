const Post = require('../models/blogModel');
const { uploadToFirebase, UPLOAD_PATHS } = require('../utils/firebaseStorage');
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
    let video_url = null;

    if (req.files) {
      if (req.files.image) {
        image_url = await uploadToFirebase(req.files.image[0], UPLOAD_PATHS.BLOG_PHOTO());
      }
      if (req.files.video) {
        video_url = await uploadToFirebase(req.files.video[0], UPLOAD_PATHS.BLOG_PHOTO());
      }
    }

    const {
      rows
    } = await Post.create({
      title,
      content,
      image_url,
      video_url
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
      content,
      removeImage,
      removeVideo
    } = req.body;

    const { rows: existingRows } = await Post.getOne(req.params.id);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const existing = existingRows[0];

    let image_url = removeImage === 'true' ? null : (req.body.image_url || existing.image_url);
    let video_url = removeVideo === 'true' ? null : (req.body.video_url || existing.video_url);

    if (req.files) {
      if (req.files.image) {
        image_url = await uploadToFirebase(req.files.image[0], UPLOAD_PATHS.BLOG_PHOTO());
      }
      if (req.files.video) {
        video_url = await uploadToFirebase(req.files.video[0], UPLOAD_PATHS.BLOG_PHOTO());
      }
    }

    const {
      rows
    } = await Post.update(req.params.id, {
      title,
      content,
      image_url,
      video_url
    });
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