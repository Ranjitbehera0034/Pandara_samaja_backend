const LeaderModel = require('../models/leaderModel');
const gDrive = require('../config/googleDrive');

exports.getAllLeaders = async (req, res) => {
    try {
        const { level } = req.query;
        let leaders;
        if (level) {
            leaders = await LeaderModel.findByLevel(level);
        } else {
            leaders = await LeaderModel.findAll();
        }
        res.json({ success: true, count: leaders.length, data: leaders });
    } catch (err) {
        console.error("Error fetching leaders:", err);
        res.status(500).json({ success: false, message: "Error fetching leaders", error: err.message });
    }
};

exports.getLeaderById = async (req, res) => {
    try {
        const leader = await LeaderModel.findById(req.params.id);
        if (!leader) return res.status(404).json({ success: false, message: "Leader not found" });
        res.json({ success: true, data: leader });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching leader", error: err.message });
    }
};

exports.createLeader = async (req, res) => {
    try {
        let image_url = req.body.image_url || null;
        if (req.file) {
            image_url = await gDrive.uploadFile(req.file);
        }
        const data = { ...req.body, image_url };
        const leader = await LeaderModel.create(data);
        res.status(201).json({ success: true, data: leader });
    } catch (err) {
        console.error("Error creating leader:", err);
        res.status(500).json({ success: false, message: "Error creating leader", error: err.message });
    }
};

exports.updateLeader = async (req, res) => {
    try {
        let image_url = req.body.image_url || null;
        if (req.file) {
            image_url = await gDrive.uploadFile(req.file);
        } else if (!image_url && req.body.existingImage) {
            image_url = req.body.existingImage;
        }

        const data = { ...req.body };
        if (image_url) data.image_url = image_url;

        const leader = await LeaderModel.update(req.params.id, data);
        if (!leader) return res.status(404).json({ success: false, message: "Leader not found" });

        res.json({ success: true, data: leader });
    } catch (err) {
        console.error("Error updating leader:", err);
        res.status(500).json({ success: false, message: "Error updating leader", error: err.message });
    }
};

exports.deleteLeader = async (req, res) => {
    try {
        const leader = await LeaderModel.delete(req.params.id);
        if (!leader) return res.status(404).json({ success: false, message: "Leader not found" });
        res.json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error deleting leader", error: err.message });
    }
};
