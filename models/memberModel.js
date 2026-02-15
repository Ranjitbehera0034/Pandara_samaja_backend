const pool = require('../config/db');
const ExcelJS = require('exceljs');
const Cursor = require('pg-cursor');
const format = require('pg-format');

/**
 * Generate a unique membership number
 * Format: MEM + 7 random digits (e.g., MEM1234567)
 */
const generateMembershipNo = async () => {
  let membershipNo;
  let exists = true;

  while (exists) {
    // Generate random 7-digit number
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    membershipNo = `MEM${randomNum}`;

    // Check if it already exists
    const result = await pool.query(
      "SELECT 1 FROM members WHERE membership_no = $1",
      [membershipNo]
    );
    exists = result.rows.length > 0;
  }

  return membershipNo;
};

/**
 * Create a new member
 * Auto-generates membership_no if not provided
 */
exports.create = async (data) => {
  // Helper to sanitize numeric fields
  const toIntOrNull = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  // Auto-generate membership_no if not provided
  const membershipNo = data.membership_no?.trim() || await generateMembershipNo();

  // Parse family_members: accept JSON string or array
  let familyMembers = data.family_members ?? [];
  if (typeof familyMembers === 'string') {
    try { familyMembers = JSON.parse(familyMembers); } catch { familyMembers = []; }
  }

  const params = [
    membershipNo,
    data.name ?? null,
    data.head_gender ?? null,
    data.mobile ?? null,
    toIntOrNull(data.male),
    toIntOrNull(data.female),
    data.district ?? null,
    data.taluka ?? null,
    data.panchayat ?? null,
    data.village ?? null,
    data.aadhar_no ?? null,
    JSON.stringify(familyMembers),
    data.address ?? null
  ];

  const query = `
    INSERT INTO members (membership_no, name, head_gender, mobile, male, female, district, taluka, panchayat, village, aadhar_no, family_members, address)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
    RETURNING *`;

  const res = await pool.query(query, params);
  return res.rows[0];
};

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

  // Parse family_members: accept JSON string or array
  let familyMembers = merged.family_members ?? [];
  if (typeof familyMembers === 'string') {
    try { familyMembers = JSON.parse(familyMembers); } catch { familyMembers = []; }
  }

  // Use merged values, defaulting to null if still undefined/null
  const params = [
    merged.name ?? null,
    merged.head_gender ?? null,
    merged.mobile ?? null,
    p_male,
    p_female,
    merged.district ?? null,
    merged.taluka ?? null,
    merged.panchayat ?? null,
    merged.village ?? null,
    merged.aadhar_no ?? null,
    JSON.stringify(familyMembers),
    merged.address ?? null,
    id
  ];

  // Always update by membership_no since 'id' column does not exist
  const query = `
    UPDATE members 
    SET name=$1, head_gender=$2, mobile=$3, male=$4, female=$5, district=$6, taluka=$7, panchayat=$8, village=$9,
        aadhar_no=$10, family_members=$11::jsonb, address=$12
    WHERE membership_no=$13 RETURNING *`;

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
    { header: 'Head Gender', key: 'head_gender', width: 10 },
    { header: 'Mobile', key: 'mobile', width: 12 },
    { header: 'Male', key: 'male', width: 6 },
    { header: 'Female', key: 'female', width: 6 },
    { header: 'District', key: 'district', width: 15 },
    { header: 'Taluka', key: 'taluka', width: 15 },
    { header: 'Panchayat', key: 'panchayat', width: 15 },
    { header: 'Village', key: 'village', width: 15 },
    { header: 'Aadhar No.', key: 'aadhar_no', width: 15 },
    { header: 'Family Members', key: 'family_members_text', width: 40 },
    { header: 'Address', key: 'address', width: 30 }
  ];

  const client = await pool.connect();
  try {
    const cursor = client.query(new Cursor(`
      SELECT membership_no, name, head_gender, mobile, male, female,
             district, taluka, panchayat, village,
             aadhar_no, family_members, address
      FROM   public.members
      ORDER  BY district, taluka, panchayat, name
    `));

    const batchSize = 500;
    let rows;
    while ((rows = await cursor.read(batchSize)).length) {
      // Convert family_members JSONB to readable text for Excel
      const mappedRows = rows.map(r => ({
        ...r,
        family_members_text: Array.isArray(r.family_members)
          ? r.family_members.map(fm => `${fm.name || ''} (${fm.relation || ''}, Age: ${fm.age || ''})`).join('; ')
          : ''
      }));
      sheet.addRows(mappedRows);
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

  const vals = rows.map(r => {
    let fm = r.family_members ?? [];
    if (typeof fm === 'string') {
      try { fm = JSON.parse(fm); } catch { fm = []; }
    }
    return [
      r.membership_no,
      r.name,
      r.head_gender ?? null,
      r.mobile,
      r.male,
      r.female,
      r.district,
      r.taluka,
      r.panchayat,
      r.village,
      r.aadhar_no ?? null,
      JSON.stringify(fm),
      r.address ?? null
    ];
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql = format(`
      INSERT INTO public.members
        (membership_no, name, head_gender, mobile, male, female,
         district, taluka, panchayat, village,
         aadhar_no, family_members, address)
      VALUES %L
      ON CONFLICT ON CONSTRAINT members_membership_no_key DO UPDATE
        SET name           = EXCLUDED.name,
            head_gender    = EXCLUDED.head_gender,
            mobile         = EXCLUDED.mobile,
            male           = EXCLUDED.male,
            female         = EXCLUDED.female,
            district       = EXCLUDED.district,
            taluka         = EXCLUDED.taluka,
            panchayat      = EXCLUDED.panchayat,
            village        = EXCLUDED.village,
            aadhar_no      = EXCLUDED.aadhar_no,
            family_members = EXCLUDED.family_members::jsonb,
            address        = EXCLUDED.address;
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
