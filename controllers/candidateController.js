const model = require('../models/candidateModel');

// controller
exports.getAll = async (req, res) => {
  const gender = req.query.gender;
  const result = gender
    ? await model.getAllByGender(gender)
    : await model.getAll();
  res.json(result.rows);
};


exports.getOne = async (req,res) => {
    const result = await model.getById(req.params.id);
  
    res.json(result.rows[0]);
}

exports.create = async (req, res) => {
  try {
    const data = req.body;
    if (req.file) {
      data.photo = "/uploads/" + req.file.filename;
    }
    const result = await model.createCandidate(data);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create candidate" });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    if (req.file) {
      data.photo = "/uploads/" + req.file.filename;
    }
    const result = await model.updateCandidate(id, data);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update candidate" });
  }
};

exports.remove = async (req,res) => {
    await model.remove(req.params.id);
  res.status(204).send();
}

