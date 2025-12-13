const gDrive = require('../config/googleDrive');
const model = require('../models/candidateModel');
const fs = require('fs');



// controller
exports.getAll = async (req, res) => {
  const gender = req.query.gender;
  const result = gender
    ? await model.getAllByGender(gender)
    : await model.getAll();
  res.json(result.rows);
};


exports.getOne = async (req, res) => {
  const result = await model.getById(req.params.id);

  res.json(result.rows[0]);
}

// controllers/candidateController.js
exports.create = async (req, res) => {
  try {
    const data = { ...req.body };

    // 1. Validate required fields
    if (!data.name || !data.gender) {
      return res.status(400).json({ error: 'Name and gender are required' });
    }

    // convert empty strings to null
    Object.keys(data).forEach(k => {
      if (data[k] === "") data[k] = null;
    });

    // 2. Handle photo: file upload OR provided URL
    if (req.file) {
      data.photo = await gDrive.uploadFile(req.file);
    } else if (data.photoUrl) {
      data.photo = data.photoUrl;
    }

    const result = await model.createCandidate(data);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create candidate error:', err);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
};


exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    if (req.file) {
      data.photo = await gDrive.uploadFile(req.file); // public URL
      // file deletion handled by uploadFile
    }
    const result = await model.updateCandidate(id, data);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update candidate" });
  }
};

exports.remove = async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).send();
};

exports.markMatched = async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerName, partnerGender } = req.body;

    if (!partnerName || !partnerGender) {
      return res.status(400).json({ error: 'Partner name and gender are required' });
    }

    const result = await model.markMatched(id, partnerName, partnerGender);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark matched error:', err);
    res.status(500).json({ error: 'Failed to mark candidate as matched' });
  }
};



