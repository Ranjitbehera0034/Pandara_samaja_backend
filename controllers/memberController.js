const model = require('../models/memberModel');
const ExcelJS = require('exceljs');
const fs = require('node:fs/promises');

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
    res.setHeader('Content-Disposition', 'attachment; filename="members.xlsx"');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await model.exportExcel(res); // streams into res
    // DO NOT call res.end() here; ExcelJS will end the stream.
  } catch (err) {
    console.error('Excel export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to export members' });
    }
  }
};

/**
 * NEW: Import from uploaded Excel file into DB
 * Expects form-data: file=<xlsx>
 */
exports.importExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const filePath = req.file.path;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet('Members') || workbook.worksheets[0];
    if (!sheet) throw new Error('No worksheet found');

    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, i) => {
      if (i === 1) return; // skip header
      rows.push({
        membership_no: row.getCell(1).value?.toString().trim(),
        name:          row.getCell(2).value?.toString().trim(),
        mobile:        row.getCell(3).value?.toString().trim(),
        male:          row.getCell(4).value ?? null,
        female:        row.getCell(5).value ?? null,
        district:      row.getCell(6).value?.toString().trim(),
        taluka:        row.getCell(7).value?.toString().trim(),
        panchayat:     row.getCell(8).value?.toString().trim(),
        village:       row.getCell(9).value?.toString().trim()
      });
    });

    const imported = await model.bulkUpsertMembers(rows);
    res.json({ imported });
  } catch (err) {
    console.error('Excel import error:', err);
    res.status(500).json({ message: 'Failed to import members' });
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
};

exports.importRows = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ message: 'No rows provided' });
    }

    // sanitize / normalize a bit, and drop obviously blank items
    const clean = rows.map(r => ({
      membership_no: (r.membership_no ?? '').toString().trim(),
      name:          (r.name ?? '').toString().trim(),
      mobile:        (r.mobile ?? '').toString().replace(/\D/g, ''),
      male:          r.male === '' || r.male == null ? null : Number(r.male),
      female:        r.female === '' || r.female == null ? null : Number(r.female),
      district:      (r.district ?? '').toString().trim(),
      taluka:        (r.taluka ?? '').toString().trim(),
      panchayat:     (r.panchayat ?? '').toString().trim(),
      village:       (r.village ?? '').toString().trim()
    })).filter(r => r.membership_no && r.name);

    if (!clean.length) {
      return res.status(400).json({ message: 'No valid rows after cleaning' });
    }

    const imported = await model.bulkUpsertMembers(clean);
    return res.json({ imported });
  } catch (err) {
    console.error('JSON import error:', err);
    return res.status(500).json({ message: 'Failed to import members' });
  }
};

