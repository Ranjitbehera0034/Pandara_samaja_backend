const gDrive = require('../config/googleDrive');
const model = require('../models/candidateModel');

// controller
exports.getAll = async (req, res) => {
  const gender = req.query.gender;
  const result = gender ? await model.getAllByGender(gender) : await model.getAll();
  res.json(result.rows);
};
exports.getOne = async (req, res) => {
  const result = await model.getById(req.params.id);
  res.json(result.rows[0]);
};

// controllers/candidateController.js
exports.create = async (req, res, next) => {
  try {
    const body = req.body;
    const data = {
      ...body,
      dob: body.date_of_birth || body.dob,
      father: body.father_name || body.father,
      phone: body.mobile || body.phone,
      author_id: req.anyUser ? req.anyUser.id : null,
      status: 'pending' // Initial status
    };

    // 1. Validate required fields
    if (!data.name || !data.gender) {
      return res.status(400).json({
        error: 'Name and gender are required'
      });
    }

    // convert empty strings to null
    Object.keys(data).forEach(k => {
      if (data[k] === "") data[k] = null;
    });

    // 2. Handle uploads: photo AND manual_form
    if (req.files) {
      if (req.files.photo) {
        data.photo = await gDrive.uploadFile(req.files.photo[0]);
      }
      if (req.files.manual_form) {
        data.manual_form = await gDrive.uploadFile(req.files.manual_form[0]);
      }
    }

    if (!data.photo && data.photoUrl) {
      data.photo = data.photoUrl;
    }
    const result = await model.createCandidate(data);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create candidate error:', err);
    next(err);
  }
};
exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    // Fetch existing candidate to preserve files
    const existingResult = await model.getById(id);
    let existing = null;
    if (existingResult.rows.length > 0) {
      existing = existingResult.rows[0];
    }

    if (req.files) {
      if (req.files.photo) {
        data.photo = await gDrive.uploadFile(req.files.photo[0]);
      } else if (existing) {
        data.photo = existing.photo;
      }

      if (req.files.manual_form) {
        data.manual_form = await gDrive.uploadFile(req.files.manual_form[0]);
      } else if (existing) {
        data.manual_form = existing.manual_form;
      }
    } else if (existing) {
      data.photo = existing.photo;
      data.manual_form = existing.manual_form;
    }

    const result = await model.updateCandidate(id, data);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update candidate error:", err);
    next(err);
  }
};
exports.remove = async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).send();
};
exports.markMatched = async (req, res, next) => {
  try {
    const {
      id
    } = req.params;
    const {
      partnerName,
      partnerGender
    } = req.body;
    if (!partnerName || !partnerGender) {
      return res.status(400).json({
        error: 'Partner name and gender are required'
      });
    }
    const result = await model.markMatched(id, partnerName, partnerGender);
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Candidate not found'
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark matched error:', err);
    next(err);
  }
};