const Post = require('../models/blogModel');
const { uploadToFirebase, getSignedMediaUrl, UPLOAD_PATHS } = require('../utils/firebaseStorage');

exports.getAll = async (req, res, next) => {
  try {
    const {
      rows
    } = await Post.getAll();
    // Resolve media for all posts
    const enrichedPosts = await Promise.all(rows.map(async post => ({
      ...post,
      image_url: await getSignedMediaUrl(post.image_url),
      video_url: await getSignedMediaUrl(post.video_url)
    })));

    res.json({
      success: true,
      posts: enrichedPosts
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
    const post = rows[0];
    post.image_url = await getSignedMediaUrl(post.image_url);
    post.video_url = await getSignedMediaUrl(post.video_url);
    res.json(post);
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
    const post = rows[0];
    post.image_url = await getSignedMediaUrl(post.image_url);
    post.video_url = await getSignedMediaUrl(post.video_url);
    res.status(201).json(post);
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
    const post = rows[0];
    post.image_url = await getSignedMediaUrl(post.image_url);
    post.video_url = await getSignedMediaUrl(post.video_url);
    res.json(post);
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

/**
 * POST /api/v1/posts/:id/view
 *
 * Records a single video-view event for a blog/announcement post.
 * Accepts EITHER a member-portal token OR an admin token (via requireAnyAuth middleware).
 *
 * Body: (none required — viewer identity comes from the token)
 */
exports.recordView = async (req, res, next) => {
  try {
    const postId = req.params.id;

    // Verify the post exists
    const { rows } = await Post.getOne(postId);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Build viewer descriptor from whichever token was used
    let viewer;
    if (req.portalMember) {
      // Member-portal token
      viewer = {
        type: 'member',
        id: req.portalMember.membership_no,
        name: req.portalMember.name,
        mobile: req.portalMember.mobile || null
      };
    } else if (req.user) {
      // Admin / SuperAdmin token
      viewer = {
        type: 'admin',
        id: req.user.username,
        name: req.user.username,
        mobile: null
      };
    } else {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await Post.recordVideoView(postId, viewer);

    return res.json({ success: true, views_count: result.views_count });
  } catch (err) {
    console.error('Record View Error:', err);
    next(err);
  }
};

/**
 * GET /api/v1/posts/:id/viewers?page=1&limit=20
 *
 * Admin-only. Returns a paginated list of every viewer who has watched the video.
 */
exports.getViewers = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    // Verify the post exists
    const { rows } = await Post.getOne(postId);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const { viewers, total } = await Post.getVideoViewers(postId, limit, offset);

    return res.json({
      success: true,
      post_id: postId,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      viewers
    });
  } catch (err) {
    console.error('Get Viewers Error:', err);
    next(err);
  }
};