const pool = require('../config/db');

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

exports.bulkImport = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* prepared statement once, re-used inside the loop */
    const stmt = `
      INSERT INTO members
        (membership_no,name, mobile, male, female,
         district, taluka, panchayat, village)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (membership_no) DO UPDATE SET
        name       = EXCLUDED.name,
        male       = EXCLUDED.male,
        female     = EXCLUDED.female,
        district   = EXCLUDED.district,
        taluka     = EXCLUDED.taluka,
        panchayat  = EXCLUDED.panchayat,
        village    = EXCLUDED.village
    `;

    for (const r of rows) {
      await client.query(stmt, [
        (r.membership_no || '').trim(), 
        r.name.trim(),
        r.mobile.trim(),
        Number(r.male   || 0),
        Number(r.female || 0),
        (r.district  || '').trim(),
        (r.taluka    || '').trim(),
        (r.panchayat || '').trim(),
        (r.village   || '').trim()
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;                         // let controller handle the 500
  } finally {
    client.release();
  }
};
