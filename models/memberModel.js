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
    "SELECT * FROM members WHERE LOWER(name) LIKE LOWER($1) OR mobile LIKE $1",
    [q]
  );
};

/**
 * Streams the members table into an Excel workbook.
 * @param {Writable} stream – the writable response stream (res)
 */
exports.exportExcel = async (stream) => {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Members');

  sheet.columns = [
    { header: 'Membership No.', key: 'membership_no', width: 15 },
    { header: 'Name',           key: 'name',          width: 25 },
    { header: 'Mobile',         key: 'mobile',        width: 12 },
    { header: 'Male',           key: 'male',          width: 6 },
    { header: 'Female',         key: 'female',        width: 6 },
    { header: 'District',       key: 'district',      width: 15 },
    { header: 'Taluka',         key: 'taluka',        width: 15 },
    { header: 'Panchayat',      key: 'panchayat',     width: 15 },
    { header: 'Village',        key: 'village',       width: 15 }
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
      INSERT INTO members
        (membership_no, name, mobile, male, female,
         district, taluka, panchayat, village)
      VALUES %L
      ON CONFLICT (membership_no) DO UPDATE
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
