const communityModel = require('../models/communityModel');

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════

exports.getEvents = async (req, res) => {
    try {
        const events = await communityModel.getEvents();
        res.json({ success: true, events });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to fetch community events' });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const event = await communityModel.createEvent(
            title,
            description,
            new Date(date),
            location,
            imageUrl,
            req.portalMember.membership_no
        );
        res.json({ success: true, event });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to create community event' });
    }
};

exports.registerEvent = async (req, res) => {
    try {
        await communityModel.rsvpEvent(req.params.id, req.portalMember.membership_no);
        res.json({ success: true, message: 'RSVP confirmed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to RSVP for event' });
    }
};


// ═══════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════

exports.getGroups = async (req, res) => {
    try {
        const groups = await communityModel.getGroups();
        res.json({ success: true, groups });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to fetch groups' });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { name, description, privacy_level } = req.body;
        const group = await communityModel.createGroup(
            name,
            description,
            privacy_level || 'public',
            req.portalMember.membership_no
        );
        res.json({ success: true, group });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to create group' });
    }
};

exports.joinGroup = async (req, res) => {
    try {
        const result = await communityModel.joinGroup(req.params.groupId, req.portalMember.membership_no);
        res.json({ success: true, ...result });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to join/leave group' });
    }
};


// ═══════════════════════════════════════════════════
// EXPLORE STATS
// ═══════════════════════════════════════════════════

exports.getExploreStats = async (req, res) => {
    try {
        const stats = await communityModel.getExploreStats();
        res.json({ success: true, stats });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to fetch explore stats' });
    }
};

// ═══════════════════════════════════════════════════
// LIVE STREAMS
// ═══════════════════════════════════════════════════

exports.getLiveStreams = async (req, res) => {
    try {
        // Return mock or actual list of active streams (currently empty as it's an advanced feature)
        // Frontend uses this payload structure, expanding this when WebRTC / Mediasoup is integrated.
        res.json({ success: true, streams: [] });
    } catch (e) {
        console.error('Get live streams error:', e);
        res.status(500).json({ success: false, message: 'Failed to fetch live streams' });
    }
};
