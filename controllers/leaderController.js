const LeaderModel = require('../models/leaderModel');
const gDrive = require('../config/googleDrive');
exports.getAllLeaders = async (req, res, next) => {
  try {
    const {
      level
    } = req.query;
    let leaders;
    if (level) {
      leaders = await LeaderModel.findByLevel(level);
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
      image_url = await gDrive.uploadFile(req.file);
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
    let image_url = req.body.image_url || null;
    if (req.file) {
      image_url = await gDrive.uploadFile(req.file);
    } else if (!image_url && req.body.existingImage) {
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