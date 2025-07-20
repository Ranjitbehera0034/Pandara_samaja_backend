const pool = require('../config/db');
const ExcelJS = require('exceljs');
const Cursor = require('pg-cursor'); 

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

  /* 1. Header row ------------------------------------------------------ */
  sheet.columns = [
    { header: 'Membership No.', key: 'membership_no', width: 15 },
    { header: 'Name',           key: 'name',          width: 25 },
    { header: 'Mobile',         key: 'mobile',        width: 10 },
    { header: 'Male',           key: 'male',          width: 6 },
    { header: 'Female',         key: 'female',        width: 6 },
    { header: 'District',       key: 'district',      width: 15 },
    { header: 'Taluka',         key: 'taluka',        width: 15 },
    { header: 'Panchayat',      key: 'panchayat',     width: 15 },
    { header: 'Village',        key: 'village',       width: 15 }
  ];

  /* 2. Stream rows 500 at a time with pg‑cursor ------------------------ */
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
    // eslint-disable-next-line no-cond-assign
    while ((rows = await cursor.read(batchSize)).length) {
      sheet.addRows(rows);             // push straight into worksheet
    }
    await cursor.close();
  } finally {
    client.release();
  }

  /* 3. Pipe workbook to the outgoing HTTP stream ---------------------- */
  await workbook.xlsx.write(stream);
};
