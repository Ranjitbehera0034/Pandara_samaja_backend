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

const MAXLEN = {
  membership_no: 10,
  mobile: 10,
  // add others if your table has small varchar columns
};

const toDigits = v => (v ?? '').toString().replace(/\D/g, '');

exports.importRows = async (req, res) => {
  try {
    const src = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!src.length) return res.status(400).json({ message: 'No rows provided' });

    const warnings = [];
    const clean = src.map((r, i) => {
      const rowNum = i + 2; // header is usually row 1

      const rec = {
        membership_no: (r.membership_no ?? '').toString().trim(),
        name:          (r.name ?? '').toString().trim(),
        mobile:        toDigits(r.mobile),
        male:          r.male === '' || r.male == null ? null : Number(r.male),
        female:        r.female === '' || r.female == null ? null : Number(r.female),
        district:      (r.district ?? '').toString().trim(),
        taluka:        (r.taluka ?? '').toString().trim(),
        panchayat:     (r.panchayat ?? '').toString().trim(),
        village:       (r.village ?? '').toString().trim(),
      };

      // length -> null policy
      for (const [field, max] of Object.entries(MAXLEN)) {
        const v = rec[field];
        if (v && v.length > max) {
          warnings.push({ row: rowNum, field, reason: `length>${max}`, value: v, length: v.length });
          rec[field] = null;
        }
      }

      // you may also want to null truly empty strings
      Object.keys(rec).forEach(k => {
        if (rec[k] === '') rec[k] = null;
      });

      return rec;
    })
    // keep rows that at least have a name; membership_no can be null as per requirement
    .filter(r => r.name);

    const imported = await model.bulkUpsertMembers(clean);
    return res.json({ imported, warnings });
  } catch (err) {
    console.error('JSON import error:', err);
    return res.status(500).json({ message: 'Failed to import members' });
  }
};

