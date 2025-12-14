const model = require('../models/memberModel');
const ExcelJS = require('exceljs');
const fs = require('node:fs/promises');

// Helper to mask mobile number (show last 4 digits only)
const maskMobile = (mobile) => {
  if (!mobile) return mobile;
  const s = mobile.toString();
  // If undefined/null/empty handled above. If too short, mask all.
  if (s.length <= 4) return '******';
  return '******' + s.slice(-4);
};

// Helper: mask result rows
const maskRows = (rows, isAdmin) => {
  if (isAdmin) return rows;
  return rows.map(r => ({
    ...r,
    mobile: maskMobile(r.mobile)
  }));
};

exports.getAll = async (req, res) => {
  // Check if search query parameter exists
  if (req.query.search) {
    const data = await model.search(req.query.search);
    return res.json(maskRows(data.rows, req.user?.role === 'admin'));
  }

  const data = await model.getAll();
  console.log('DEBUG: getAll user:', req.user, 'isAdmin:', req.user?.role === 'admin');
  res.json(maskRows(data.rows, req.user?.role === 'admin'));
};

exports.getByLocation = async (req, res) => {
  const { district, taluka, panchayat } = req.query;
  const data = await model.getAllByLocation(district, taluka, panchayat);
  res.json(maskRows(data.rows, req.user?.role === 'admin'));
};

exports.search = async (req, res) => {
  const { keyword } = req.query;
  const data = await model.search(keyword);
  res.json(maskRows(data.rows, req.user?.role === 'admin'));
};

exports.getOne = async (req, res) => {
  try {
    const member = await model.getOne(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Mask if not admin
    if (req.user?.role !== 'admin') {
      member.mobile = maskMobile(member.mobile);
    }

    res.json(member);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const member = await model.update(req.params.id, req.body);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await model.delete(req.params.id);
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
        name: row.getCell(2).value?.toString().trim(),
        mobile: row.getCell(3).value?.toString().trim(),
        male: row.getCell(4).value ?? null,
        female: row.getCell(5).value ?? null,
        district: row.getCell(6).value?.toString().trim(),
        taluka: row.getCell(7).value?.toString().trim(),
        panchayat: row.getCell(8).value?.toString().trim(),
        village: row.getCell(9).value?.toString().trim()
      });
    });

    const imported = await model.bulkUpsertMembers(rows);
    res.json({ imported });
  } catch (err) {
    console.error('Excel import error:', err);
    res.status(500).json({ message: 'Failed to import members' });
  } finally {
    await fs.unlink(filePath).catch(() => { });
  }
};

const MAXLEN = {
  membership_no: 10,
  mobile: 10,
};

const toDigits = v => (v ?? '').toString().replace(/\D/g, '');

exports.importRows = async (req, res) => {
  try {
    const src = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!src.length) return res.status(400).json({ message: 'No rows provided' });

    const warnings = [];
    const prepared = src.map((r, i) => {
      const rowNum = i + 2;
      const rec = {
        membership_no: (r.membership_no ?? '').toString().trim(),
        name: (r.name ?? '').toString().trim(),
        mobile: toDigits(r.mobile),
        male: (r.male === '' || r.male == null || isNaN(Number(r.male))) ? null : Number(r.male),
        female: (r.female === '' || r.female == null || isNaN(Number(r.female))) ? null : Number(r.female),
        district: (r.district ?? '').toString().trim(),
        taluka: (r.taluka ?? '').toString().trim(),
        panchayat: (r.panchayat ?? '').toString().trim(),
        village: (r.village ?? '').toString().trim(),
      };

      // Mandatory fields
      if (!rec.membership_no) {
        warnings.push({ row: rowNum, field: 'membership_no', reason: 'missing membership_no' });
        return null;
      }
      if (!rec.name) {
        warnings.push({ row: rowNum, field: 'name', reason: 'missing name' });
        return null;
      }

      // Length checks: skip rows with overlong membership_no, truncate mobile
      if (rec.membership_no.length > MAXLEN.membership_no) {
        warnings.push({ row: rowNum, field: 'membership_no', reason: `length>${MAXLEN.membership_no}`, value: rec.membership_no });
        return null; // skip entirely, since membership_no must be valid
      }
      if (rec.mobile && rec.mobile.length > MAXLEN.mobile) {
        warnings.push({ row: rowNum, field: 'mobile', reason: `length>${MAXLEN.mobile}`, value: rec.mobile });
        rec.mobile = rec.mobile.slice(0, MAXLEN.mobile);
      }

      return { rec, rowNum };
    })
      .filter(Boolean);

    // Deduplicate by membership_no
    const deduped = [];
    const seen = new Map();
    for (const { rec, rowNum } of prepared) {
      if (seen.has(rec.membership_no)) {
        warnings.push({
          row: rowNum,
          field: 'membership_no',
          reason: `Duplicate membership_no '${rec.membership_no}' within this upload; keeping the first`,
        });
        continue;
      }
      seen.set(rec.membership_no, true);
      deduped.push(rec);
    }

    const imported = await model.bulkUpsertMembers(deduped);
    return res.json({ imported, warnings });
  } catch (err) {
    console.error('JSON import error:', err);
    return res.status(500).json({ message: 'Failed to import members' });
  }
};







