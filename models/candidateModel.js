const db = require('../config/db');

/* ─────────────── READ ─────────────── */
exports.getAll = () =>
  db.query("SELECT * FROM candidates WHERE is_matched = false AND LOWER(status) = 'approved' ORDER BY name");

exports.getAllByGender = gender =>
  db.query("SELECT * FROM candidates WHERE LOWER(gender) = LOWER($1) AND is_matched = false AND LOWER(status) = 'approved' ORDER BY name", [gender]);

exports.getById = id =>
  db.query('SELECT * FROM candidates WHERE id = $1', [id]);

/* ─────────────── CREATE ────────────── */
exports.createCandidate = data => {
  const {
    name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
    technicalEducation, professionalEducation, occupation, father, mother,
    address, phone, email, photo, author_id, status
  } = data;

  return db.query(
    `INSERT INTO candidates
      (name, gender, dob, age, height, blood_group, gotra, bansha, education,
       technical_education, professional_education, occupation, father, mother,
       address, phone, email, photo, author_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, $19, $20)
     RETURNING *`,
    [name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
      technicalEducation, professionalEducation, occupation, father, mother,
      address, phone, email, photo, author_id || null, status || 'pending']
  );
};

/* ─────────────── UPDATE ────────────── */
exports.updateCandidate = (id, data) => {   // ←  RENAMED to match controller
  const {
    name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
    technicalEducation, professionalEducation, occupation, father, mother,
    address, phone, email, photo, status, verified_by, verified_at
  } = data;

  return db.query(
    `UPDATE candidates SET
       name=$1, gender=$2, dob=$3, age=$4, height=$5, blood_group=$6,
       gotra=$7, bansha=$8, education=$9, technical_education=$10,
       professional_education=$11, occupation=$12, father=$13, mother=$14,
       address=$15, phone=$16, email=$17, photo=$18, status=COALESCE($19, status),
       verified_by=$20, verified_at=$21
     WHERE id=$22
     RETURNING *`,
    [name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
      technicalEducation, professionalEducation, occupation, father, mother,
      address, phone, email, photo, status || null, verified_by || null, verified_at || null, id]
  );
};

exports.markMatched = (id, partnerName, partnerGender) => {
  return db.query(
    `UPDATE candidates 
     SET is_matched = true, matched_partner_name = $1, matched_partner_gender = $2
     WHERE id = $3
     RETURNING *`,
    [partnerName, partnerGender, id]
  );
};

/* ─────────────── DELETE ────────────── */
exports.remove = id =>
  db.query('DELETE FROM candidates WHERE id = $1', [id]);
