const pool = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
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
    encrypt(data.aadhar_no) ?? null,
    JSON.stringify(familyMembers),
    data.address ?? null,
    data.state ?? null,
    data.profile_photo_url ?? null
  ];

  const query = `
    INSERT INTO members (membership_no, name, head_gender, mobile, male, female, district, taluka, panchayat, village, aadhar_no, family_members, address, state, profile_photo_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15)
    RETURNING *`;

  const res = await pool.query(query, params);
  return res.rows[0];
};

exports.getAll = async (limit = 20, offset = 0) => {
  const query = "SELECT * FROM members ORDER BY district, taluka, panchayat, name LIMIT $1 OFFSET $2";
  const res = await pool.query(query, [limit, offset]);
  res.rows.forEach(r => {
    if (r.aadhar_no) r.aadhar_no = decrypt(r.aadhar_no);
  });
  return res;
};

exports.getTotalCount = async () => {
  const res = await pool.query("SELECT COUNT(*) FROM members");
  return parseInt(res.rows[0].count, 10);
};

exports.getAllByLocation = async (district, taluka, panchayat) => {
  return pool.query(
    "SELECT * FROM members WHERE district=$1 AND taluka=$2 AND panchayat=$3",
    [district, taluka, panchayat]
  );
};

exports.search = async (keyword, limit = 20, offset = 0) => {
  const q = `%${keyword}%`;
  const res = await pool.query(
    "SELECT * FROM members WHERE (LOWER(name) LIKE LOWER($1) OR mobile LIKE $1 OR membership_no LIKE $1) ORDER BY name LIMIT $2 OFFSET $3",
    [q, limit, offset]
  );
  res.rows.forEach(r => {
    if (r.aadhar_no) r.aadhar_no = decrypt(r.aadhar_no);
  });
  return res;
};

exports.getMemberFilterOptions = async () => {
  const query = `
        SELECT DISTINCT district, taluka, panchayat
        FROM members
        WHERE (is_banned IS NULL OR is_banned = false)
          AND district IS NOT NULL AND TRIM(district) != ''
        ORDER BY district, taluka, panchayat
    `;
  const res = await pool.query(query);

  const districts = new Set();
  const talukas = {};
  const panchayats = {};

  res.rows.forEach(row => {
    const d = row.district?.trim();
    const t = row.taluka?.trim();
    const p = row.panchayat?.trim();

    if (d) {
      districts.add(d);
      if (t) {
        if (!talukas[d]) talukas[d] = new Set();
        talukas[d].add(t);

        if (p) {
          if (!panchayats[t]) panchayats[t] = new Set();
          panchayats[t].add(p);
        }
      }
    }
  });

  const serializeSet = (obj) => {
    const result = {};
    for (const [key, set] of Object.entries(obj)) {
      result[key] = Array.from(set).sort();
    }
    return result;
  };

  return {
    districts: Array.from(districts).sort(),
    talukas: serializeSet(talukas),
    panchayats: serializeSet(panchayats)
  };
};

exports.getFiltered = async (limit = 20, offset = 0, filters = {}) => {
  const params = [];
  const conditions = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    conditions.push(`(LOWER(name) LIKE LOWER($${idx}) OR mobile LIKE $${idx} OR membership_no LIKE $${idx})`);
  }
  if (filters.district) {
    params.push(filters.district);
    conditions.push(`district = $${params.length}`);
  }
  if (filters.taluka) {
    params.push(filters.taluka);
    conditions.push(`taluka = $${params.length}`);
  }
  if (filters.panchayat) {
    params.push(filters.panchayat);
    conditions.push(`panchayat = $${params.length}`);
  }
  if (filters.gender === 'female') {
    conditions.push(`LOWER(head_gender) IN ('female', 'f')`);
  } else if (filters.gender === 'male') {
    conditions.push(`LOWER(head_gender) NOT IN ('female', 'f')`);
  }
  if (filters.has_photo === 'true') {
    conditions.push(`COALESCE(trim(profile_photo_url), '') != ''`);
  } else if (filters.has_photo === 'false') {
    conditions.push(`COALESCE(trim(profile_photo_url), '') = ''`);
  }
  if (filters.has_aadhar === 'true') {
    conditions.push(`COALESCE(trim(aadhar_no), '') != ''`);
  } else if (filters.has_aadhar === 'false') {
    conditions.push(`COALESCE(trim(aadhar_no), '') = ''`);
  }
  if (filters.marital_status) {
    params.push(filters.marital_status);
    conditions.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(family_members) = 'array' THEN family_members ELSE '[]'::jsonb END) as fm WHERE fm->>'marital_status' = $${params.length})`);
  }
  if (filters.eligible_for_marriage === 'true') {
    // Gender-aware eligibility: 18+ for Female, 21+ for Male
    conditions.push(`EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(family_members) = 'array' THEN family_members ELSE '[]'::jsonb END) as fm 
      WHERE fm->>'marital_status' = 'Unmarried' 
      AND fm->>'age' ~ '^[0-9]+$' 
      AND (
        (LOWER(fm->>'gender') = 'female' AND CAST(fm->>'age' AS INTEGER) >= 18) OR 
        (LOWER(fm->>'gender') != 'female' AND CAST(fm->>'age' AS INTEGER) >= 21)
      )
    )`);
  }
  if (filters.children_count !== undefined && filters.children_count !== '') {
    params.push(parseInt(filters.children_count, 10));
    conditions.push(`(SELECT COUNT(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(family_members) = 'array' THEN family_members ELSE '[]'::jsonb END) as fm WHERE LOWER(fm->>'relation') IN ('son', 'daughter')) = $${params.length}`);
  }

  const wherePart = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM members ${wherePart} ORDER BY district, taluka, panchayat, name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  params.push(limit, offset);

  const res = await pool.query(query, params);
  res.rows.forEach(r => {
    if (r.aadhar_no) r.aadhar_no = decrypt(r.aadhar_no);
  });
  return res;
};

exports.getFilteredCount = async (filters = {}) => {
  const params = [];
  const conditions = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    conditions.push(`(LOWER(name) LIKE LOWER($${idx}) OR mobile LIKE $${idx} OR membership_no LIKE $${idx})`);
  }
  if (filters.district) {
    params.push(filters.district);
    conditions.push(`district = $${params.length}`);
  }
  if (filters.taluka) {
    params.push(filters.taluka);
    conditions.push(`taluka = $${params.length}`);
  }
  if (filters.panchayat) {
    params.push(filters.panchayat);
    conditions.push(`panchayat = $${params.length}`);
  }
  if (filters.gender === 'female') {
    conditions.push(`LOWER(head_gender) IN ('female', 'f')`);
  } else if (filters.gender === 'male') {
    conditions.push(`LOWER(head_gender) NOT IN ('female', 'f')`);
  }
  if (filters.has_photo === 'true') {
    conditions.push(`COALESCE(trim(profile_photo_url), '') != ''`);
  } else if (filters.has_photo === 'false') {
    conditions.push(`COALESCE(trim(profile_photo_url), '') = ''`);
  }
  if (filters.has_aadhar === 'true') {
    conditions.push(`COALESCE(trim(aadhar_no), '') != ''`);
  } else if (filters.has_aadhar === 'false') {
    conditions.push(`COALESCE(trim(aadhar_no), '') = ''`);
  }
  if (filters.marital_status) {
    params.push(filters.marital_status);
    conditions.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(family_members) = 'array' THEN family_members ELSE '[]'::jsonb END) as fm WHERE fm->>'marital_status' = $${params.length})`);
  }
  if (filters.eligible_for_marriage === 'true') {
    // Gender-aware eligibility: 18+ for Female, 21+ for Male
    conditions.push(`EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(family_members) = 'array' THEN family_members ELSE '[]'::jsonb END) as fm 
      WHERE fm->>'marital_status' = 'Unmarried' 
      AND fm->>'age' ~ '^[0-9]+$' 
      AND (
        (LOWER(fm->>'gender') = 'female' AND CAST(fm->>'age' AS INTEGER) >= 18) OR 
        (LOWER(fm->>'gender') != 'female' AND CAST(fm->>'age' AS INTEGER) >= 21)
      )
    )`);
  }
  if (filters.children_count !== undefined && filters.children_count !== '') {
    params.push(parseInt(filters.children_count, 10));
    conditions.push(`(SELECT COUNT(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(family_members) = 'array' THEN family_members ELSE '[]'::jsonb END) as fm WHERE LOWER(fm->>'relation') IN ('son', 'daughter')) = $${params.length}`);
  }

  const wherePart = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await pool.query(`SELECT COUNT(*) FROM members ${wherePart}`, params);
  return parseInt(res.rows[0].count, 10);
};

exports.getDemographicsStats = async (filters = {}) => {
  const { district, taluka, panchayat } = filters;
  const params = [];
  let conditions = ["(is_banned IS NULL OR is_banned = false)"];

  if (district) {
    params.push(district);
    conditions.push(`district = $${params.length}`);
  }
  if (taluka) {
    params.push(taluka);
    conditions.push(`taluka = $${params.length}`);
  }
  if (panchayat) {
    params.push(panchayat);
    conditions.push(`panchayat = $${params.length}`);
  }

  const wherePart = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Try using created_at if it exists, fallback if column missing
  const query = `
    SELECT 
      COALESCE(SUM(male), 0) as total_male,
      COALESCE(SUM(female), 0) as total_female,
      -- Male Increases
      COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN male ELSE 0 END), 0) as male_today,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN male ELSE 0 END), 0) as male_week,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN male ELSE 0 END), 0) as male_month,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('year', CURRENT_DATE) THEN male ELSE 0 END), 0) as male_year,
      -- Female Increases
      COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN female ELSE 0 END), 0) as female_today,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN female ELSE 0 END), 0) as female_week,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN female ELSE 0 END), 0) as female_month,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('year', CURRENT_DATE) THEN female ELSE 0 END), 0) as female_year
    FROM members
    ${wherePart}
  `;
  try {
    const res = await pool.query(query, params);
    return res.rows[0];
  } catch (error) {
    if (error.code === '42703') { // undefined_column for created_at
      const fallbackQuery = `
        SELECT 
          COALESCE(SUM(male), 0) as total_male,
          COALESCE(SUM(female), 0) as total_female,
          0 as male_today, 0 as male_week, 0 as male_month, 0 as male_year,
          0 as female_today, 0 as female_week, 0 as female_month, 0 as female_year
        FROM members
        ${wherePart}
      `;
      const fallbackRes = await pool.query(fallbackQuery, params);
      return fallbackRes.rows[0];
    }
    throw error;
  }
};

exports.getOne = async (id) => {
  // Use membership_no as the primary identifier since 'id' column does not exist
  const res = await pool.query("SELECT * FROM members WHERE membership_no = $1", [id]);
  const member = res.rows[0];
  if (member && member.aadhar_no) {
    member.aadhar_no = decrypt(member.aadhar_no);
  }
  return member;
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
    encrypt(merged.aadhar_no) ?? null,
    JSON.stringify(familyMembers),
    merged.address ?? null,
    merged.state ?? null,
    merged.profile_photo_url ?? null,
    id
  ];

  // Always update by membership_no since 'id' column does not exist
  const query = `
    UPDATE members 
    SET name=$1, head_gender=$2, mobile=$3, male=$4, female=$5, district=$6, taluka=$7, panchayat=$8, village=$9,
        aadhar_no=$10, family_members=$11::jsonb, address=$12, state=$13, profile_photo_url=$14
    WHERE membership_no=$15 RETURNING *`;

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
      // Convert family_members JSONB and decrypt Aadhar for Excel
      const mappedRows = rows.map(r => ({
        ...r,
        aadhar_no: r.aadhar_no ? decrypt(r.aadhar_no) : null,
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
      encrypt(r.aadhar_no?.toString()) ?? null,
      JSON.stringify(fm),
      r.address ?? null,
      r.state ?? null,
      r.profile_photo_url ?? null
    ];
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql = format(`
      INSERT INTO public.members
        (membership_no, name, head_gender, mobile, male, female,
         district, taluka, panchayat, village,
         aadhar_no, family_members, address, state, profile_photo_url)
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
            address        = EXCLUDED.address,
            state          = EXCLUDED.state,
            profile_photo_url = EXCLUDED.profile_photo_url;
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
