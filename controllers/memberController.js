const model = require('../models/memberModel');

exports.getAll = async (req, res) => {
  const data = await model.getAll();
  res.json(data.rows);
};

exports.getByLocation = async (req, res) => {
  const { district, taluka, panchayat } = req.query;
  const data = await model.getAllByLocation(district, taluka, panchayat);
  res.json(data.rows);
};

exports.search = async (req, res) => {
  const { keyword } = req.query;
  const data = await model.search(keyword);
  res.json(data.rows);
};

exports.bulkImport = async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'No rows supplied' });
  }

  try {
    await memberModel.bulkImport(rows);
    res.sendStatus(204);              // success, no payload
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ message: 'Bulk import failed' });
  }
};

