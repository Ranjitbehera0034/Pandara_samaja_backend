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

exports.exportExcel = async (req, res) => {
  try {
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="members.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await model.exportExcel(res);   // stream directly into response
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ message: 'Failed to export members' });
  }
};

