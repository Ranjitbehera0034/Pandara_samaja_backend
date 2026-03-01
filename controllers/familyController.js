const bcrypt = require('bcryptjs');
const familyModel = require('../models/familyModel');

// ═══════════════════════════════════════════════════
// ALBUMS
// ═══════════════════════════════════════════════════

exports.getAlbums = async (req, res, next) => {
  try {
    const albums = await familyModel.getAlbums(req.portalMember.membership_no);
    res.json({
      success: true,
      albums
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.createAlbum = async (req, res, next) => {
  try {
    const {
      title,
      description
    } = req.body;
    // Check if there is a cover image
    const coverUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const album = await familyModel.createAlbum(req.portalMember.membership_no, title, description, coverUrl);
    res.json({
      success: true,
      album
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.deleteAlbum = async (req, res, next) => {
  try {
    const deletedId = await familyModel.deleteAlbum(req.params.id, req.portalMember.membership_no);
    if (!deletedId) return res.status(404).json({
      success: false,
      message: 'Album not found'
    });
    res.json({
      success: true,
      message: 'Album deleted'
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.uploadPhotosToAlbum = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos uploaded'
      });
    }
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    const photos = await familyModel.addPhotosToAlbum(req.params.id, urls);
    res.json({
      success: true,
      photos
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════

exports.getEvents = async (req, res, next) => {
  try {
    const events = await familyModel.getEvents(req.portalMember.membership_no);
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
      location,
      type
    } = req.body;
    const event = await familyModel.createEvent(req.portalMember.membership_no, title, description, new Date(date), location, type);
    res.json({
      success: true,
      event
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.deleteEvent = async (req, res, next) => {
  try {
    const deletedId = await familyModel.deleteEvent(req.params.id, req.portalMember.membership_no);
    if (!deletedId) return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
    res.json({
      success: true,
      message: 'Event deleted'
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.rsvpEvent = async (req, res, next) => {
  try {
    const {
      status
    } = req.body; // 'going', 'declined', 'maybe'
    const rsvp = await familyModel.rsvpEvent(req.params.id, req.portalMember.membership_no, status);
    res.json({
      success: true,
      rsvp
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// ═══════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════

exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await familyModel.getAccounts(req.portalMember.membership_no);
    res.json({
      success: true,
      accounts
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.createAccount = async (req, res, next) => {
  try {
    const {
      name,
      username,
      password
    } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const account = await familyModel.createAccount(req.portalMember.membership_no, name, username, hash);
    res.json({
      success: true,
      account
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.updateAccountStatus = async (req, res, next) => {
  try {
    const {
      status
    } = req.body; // boolean
    const isActive = status === true || status === 'true';
    const updated = await familyModel.updateAccountStatus(req.params.accountId, req.portalMember.membership_no, isActive);
    if (!updated) return res.status(404).json({
      success: false,
      message: 'Account not found'
    });
    res.json({
      success: true,
      message: 'Account status updated'
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
exports.deleteAccount = async (req, res, next) => {
  try {
    const deletedId = await familyModel.deleteAccount(req.params.accountId, req.portalMember.membership_no);
    if (!deletedId) return res.status(404).json({
      success: false,
      message: 'Account not found'
    });
    res.json({
      success: true,
      message: 'Account deleted'
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};