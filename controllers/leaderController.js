const LeaderModel = require('../models/leaderModel');
const gDrive = require('../config/googleDrive');
const { FOLDER_MAP } = require('../config/googleDrive');

exports.getAllLeaders = async (req, res, next) => {
  try {
    const { level, location } = req.query;
    let leaders;
    if (level || location) {
      leaders = await LeaderModel.findByFilter({ level, location });
    } else {
      leaders = await LeaderModel.findAll();
    }
    res.json({
      success: true,
      count: leaders.length,
      data: leaders
    });
  } catch (err) {
    console.error("Error fetching leaders:", err);
    next(err);
  }
};

// GET /api/v1/leaders/locations?level=District — distinct locations for a level
exports.getLeaderLocations = async (req, res, next) => {
  try {
    const { level } = req.query;
    if (!level) return res.json({ success: true, data: [] });
    const locations = await LeaderModel.getLocationsByLevel(level);
    res.json({ success: true, data: locations });
  } catch (err) {
    next(err);
  }
};

exports.getLeaderById = async (req, res, next) => {
  try {
    const leader = await LeaderModel.findById(req.params.id);
    if (!leader) return res.status(404).json({
      success: false,
      message: "Leader not found"
    });
    res.json({
      success: true,
      data: leader
    });
  } catch (err) {
    next(err);
  }
};
exports.createLeader = async (req, res, next) => {
  try {
    let image_url = req.body.image_url || null;
    if (req.file) {
      image_url = await gDrive.uploadFile(req.file, FOLDER_MAP.LEADERS);
    }
    const data = {
      ...req.body,
      image_url
    };
    const leader = await LeaderModel.create(data);
    res.status(201).json({
      success: true,
      data: leader
    });
  } catch (err) {
    console.error("Error creating leader:", err);
    next(err);
  }
};
exports.updateLeader = async (req, res, next) => {
  try {
    let image_url = req.body.existingImage || null;
    if (req.file) {
      image_url = await gDrive.uploadFile(req.file, FOLDER_MAP.LEADERS);
    } else if (!image_url && req.body.removeImage !== 'true') {
      image_url = req.body.existingImage;
    }
    const data = {
      ...req.body
    };
    if (image_url) data.image_url = image_url;
    const leader = await LeaderModel.update(req.params.id, data);
    if (!leader) return res.status(404).json({
      success: false,
      message: "Leader not found"
    });
    res.json({
      success: true,
      data: leader
    });
  } catch (err) {
    console.error("Error updating leader:", err);
    next(err);
  }
};
exports.deleteLeader = async (req, res, next) => {
  try {
    const leader = await LeaderModel.delete(req.params.id);
    if (!leader) return res.status(404).json({
      success: false,
      message: "Leader not found"
    });
    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};