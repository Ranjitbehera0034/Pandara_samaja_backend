const db = require('../config/db');

/* ─────────────── READ ─────────────── */
exports.getAll        = () =>           // ←  NEW
  db.query('SELECT * FROM candidates ORDER BY name');

exports.getAllByGender = gender =>
  db.query('SELECT * FROM candidates WHERE gender = $1 ORDER BY name', [gender]);

exports.getById        = id =>
  db.query('SELECT * FROM candidates WHERE id = $1', [id]);

/* ─────────────── CREATE ────────────── */
exports.createCandidate = data => {
  const {
    name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
    technicalEducation, professionalEducation, occupation, father, mother,
    address, phone, email, photo
  } = data;

  return db.query(
    `INSERT INTO candidates
      (name, gender, dob, age, height, blood_group, gotra, bansha, education,
       technical_education, professional_education, occupation, father, mother,
       address, phone, email, photo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
     technicalEducation, professionalEducation, occupation, father, mother,
     address, phone, email, photo]
  );
};

/* ─────────────── UPDATE ────────────── */
exports.updateCandidate = (id, data) => {   // ←  RENAMED to match controller
  const {
    name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
    technicalEducation, professionalEducation, occupation, father, mother,
    address, phone, email, photo
  } = data;

  return db.query(
    `UPDATE candidates SET
       name=$1, gender=$2, dob=$3, age=$4, height=$5, blood_group=$6,
       gotra=$7, bansha=$8, education=$9, technical_education=$10,
       professional_education=$11, occupation=$12, father=$13, mother=$14,
       address=$15, phone=$16, email=$17, photo=$18
     WHERE id=$19
     RETURNING *`,
    [name, gender, dob, age, height, bloodGroup, gotra, bansha, education,
     technicalEducation, professionalEducation, occupation, father, mother,
     address, phone, email, photo, id]
  );
};

/* ─────────────── DELETE ────────────── */
exports.remove = id =>
  db.query('DELETE FROM candidates WHERE id = $1', [id]);
