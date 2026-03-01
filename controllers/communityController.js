const communityModel = require('../models/communityModel');

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════

exports.getEvents = async (req, res, next) => {
  try {
    const events = await communityModel.getEvents();
    res.json({
      success: true,
      events
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      location
    } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const event = await communityModel.createEvent(title, description, new Date(date), location, imageUrl, req.portalMember.membership_no);
    res.json({
      success: true,
      event
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.registerEvent = async (req, res, next) => {
  try {
    await communityModel.rsvpEvent(req.params.id, req.portalMember.membership_no);
    res.json({
      success: true,
      message: 'RSVP confirmed'
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// ═══════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════

exports.getGroups = async (req, res, next) => {
  try {
    const groups = await communityModel.getGroups();
    res.json({
      success: true,
      groups
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.createGroup = async (req, res, next) => {
  try {
    const {
      name,
      description,
      privacy_level
    } = req.body;
    const group = await communityModel.createGroup(name, description, privacy_level || 'public', req.portalMember.membership_no);
    res.json({
      success: true,
      group
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.joinGroup = async (req, res, next) => {
  try {
    const result = await communityModel.joinGroup(req.params.groupId, req.portalMember.membership_no);
    res.json({
      success: true,
      ...result
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// ═══════════════════════════════════════════════════
// EXPLORE STATS
// ═══════════════════════════════════════════════════

exports.getExploreStats = async (req, res, next) => {
  try {
    const stats = await communityModel.getExploreStats();
    res.json({
      success: true,
      stats
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// ═══════════════════════════════════════════════════
// LIVE STREAMS
// ═══════════════════════════════════════════════════

exports.getLiveStreams = async (req, res, next) => {
  try {
    // Return mock or actual list of active streams (currently empty as it's an advanced feature)
    // Frontend uses this payload structure, expanding this when WebRTC / Mediasoup is integrated.
    res.json({
      success: true,
      streams: []
    });
  } catch (e) {
    console.error('Get live streams error:', e);
    next(e);
  }
};