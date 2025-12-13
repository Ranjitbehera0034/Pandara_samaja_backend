const pool = require('../config/db');
const ExcelJS = require('exceljs');
const Cursor = require('pg-cursor');
const format = require('pg-format');

exports.getAll = async () => {
  return pool.query("SELECT * FROM members ORDER BY district, taluka, panchayat, name");
};

exports.getAllByLocation = async (district, taluka, panchayat) => {
  return pool.query(
    "SELECT * FROM members WHERE district=$1 AND taluka=$2 AND panchayat=$3",
    [district, taluka, panchayat]
  );
};

exports.search = async (keyword) => {
  const q = `%${keyword}%`;
  return pool.query(
    "SELECT * FROM members WHERE LOWER(name) LIKE LOWER($1) OR mobile LIKE $1 OR membership_no LIKE $1",
    [q]
  );
};

exports.getOne = async (id) => {
  // Use membership_no as the primary identifier since 'id' column does not exist
  const res = await pool.query("SELECT * FROM members WHERE membership_no = $1", [id]);
  return res.rows[0];
};

exports.update = async (id, data) => {
  // Fetch existing record to support partial updates and avoid undefined params
  const existing = await exports.getOne(id);
  if (!existing) return null;

  // Helper to sanitize numeric fields
  const toIntOrNull = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  // Merge existing data with new data
  const merged = { ...existing, ...data };

  // Sanitize specific fields to match DB types
  const p_male = toIntOrNull(merged.male);
  const p_female = toIntOrNull(merged.female);

  // Use merged values, defaulting to null if still undefined/null
  const params = [
    merged.name ?? null,
    merged.mobile ?? null,
    p_male,
    p_female,
    merged.district ?? null,
    merged.taluka ?? null,
    merged.panchayat ?? null,
    merged.village ?? null,
    id
  ];

  // Always update by membership_no since 'id' column does not exist
  const query = `
    UPDATE members 
    SET name=$1, mobile=$2, male=$3, female=$4, district=$5, taluka=$6, panchayat=$7, village=$8
    WHERE membership_no=$9 RETURNING *`;

  const res = await pool.query(query, params);
  return res.rows[0];
};

exports.delete = async (id) => {
  await pool.query("DELETE FROM members WHERE membership_no = $1", [id]);
  return true;
};

/**
 * Streams the members table into an Excel workbook.
 * @param {Writable} stream – the writable response stream (res)
 */
exports.exportExcel = async (stream) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Members');

  sheet.columns = [
    { header: 'Membership No.', key: 'membership_no', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Mobile', key: 'mobile', width: 12 },
    { header: 'Male', key: 'male', width: 6 },
    { header: 'Female', key: 'female', width: 6 },
    { header: 'District', key: 'district', width: 15 },
    { header: 'Taluka', key: 'taluka', width: 15 },
    { header: 'Panchayat', key: 'panchayat', width: 15 },
    { header: 'Village', key: 'village', width: 15 }
  ];

  const client = await pool.connect();
  try {
    const cursor = client.query(new Cursor(`
      SELECT membership_no, name, mobile, male, female,
             district, taluka, panchayat, village
      FROM   public.members
      ORDER  BY district, taluka, panchayat, name
    `));

    const batchSize = 500;
    let rows;
    while ((rows = await cursor.read(batchSize)).length) {
      sheet.addRows(rows);
    }
    await cursor.close();
  } finally {
    client.release();
  }

  await workbook.xlsx.write(stream);
};

/**
 * IMPORT: Bulk upsert rows read from Excel
 * @param {Array<Object>} rows
 * @returns {number} count imported
 */
exports.bulkUpsertMembers = async (rows) => {
  if (!rows.length) return 0;

  const vals = rows.map(r => [
    r.membership_no,
    r.name,
    r.mobile,
    r.male,
    r.female,
    r.district,
    r.taluka,
    r.panchayat,
    r.village
  ]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql = format(`
      INSERT INTO public.members
        (membership_no, name, mobile, male, female,
         district, taluka, panchayat, village)
      VALUES %L
      ON CONFLICT ON CONSTRAINT members_membership_no_key DO UPDATE
        SET name      = EXCLUDED.name,
            mobile    = EXCLUDED.mobile,
            male      = EXCLUDED.male,
            female    = EXCLUDED.female,
            district  = EXCLUDED.district,
            taluka    = EXCLUDED.taluka,
            panchayat = EXCLUDED.panchayat,
            village   = EXCLUDED.village;
    `, vals);

    await client.query(sql);
    await client.query('COMMIT');
    return rows.length;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
