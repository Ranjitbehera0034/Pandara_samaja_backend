// models/matrimonyApplicationModel.js
// Handles the Matrimony Form Upload & Verification workflow
const pool = require('../config/db');

/**
 * Create the table if it doesn't exist (called once on startup or via migration).
 */
exports.ensureTable = async () => {
    // Run the migration SQL inline so the app can self-bootstrap
    await pool.query(`
        CREATE TABLE IF NOT EXISTS matrimony_applications (
            id                     SERIAL PRIMARY KEY,
            member_id              VARCHAR(20) NOT NULL,
            membership_no          VARCHAR(20) NOT NULL,
            member_name            VARCHAR(200) NOT NULL,
            relation_to_hof        VARCHAR(100) NOT NULL DEFAULT 'Self/Head',
            uploaded_by_name       VARCHAR(200),
            uploaded_by_mobile     VARCHAR(20),
            member_mobile          VARCHAR(20),
            uploaded_file_url      TEXT NOT NULL,
            file_type              VARCHAR(10) DEFAULT 'jpg',
            status                 VARCHAR(30) NOT NULL DEFAULT 'pending',
            submitted_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_by            VARCHAR(100),
            reviewed_at            TIMESTAMP,
            admin_remarks          TEXT,
            verification_checklist JSONB DEFAULT '{}',
            version                INTEGER NOT NULL DEFAULT 1,
            history                JSONB NOT NULL DEFAULT '[]',
            CONSTRAINT fk_matapp_member FOREIGN KEY (member_id) REFERENCES members(membership_no) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_matapp_status   ON matrimony_applications(status);
        CREATE INDEX IF NOT EXISTS idx_matapp_member   ON matrimony_applications(member_id);
        CREATE INDEX IF NOT EXISTS idx_matapp_submitted ON matrimony_applications(submitted_at DESC);
    `);
};

/**
 * Submit a new application (version 1) or a re-upload (version n+1).
 * Returns the created/updated application row.
 */
exports.submitApplication = async ({
    memberId,
    membershipNo,
    memberName,
    relationToHof,
    uploadedByName,
    uploadedByMobile,
    memberMobile,
    uploadedFileUrl,
    fileType,
}) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check for existing non-terminal application for this specific person (member_id + member_mobile)
        const existing = await client.query(
            `SELECT id, status, version FROM matrimony_applications
             WHERE member_id = $1 AND member_mobile = $2
             ORDER BY submitted_at DESC LIMIT 1`,
            [memberId, memberMobile || '']
        );

        const existingRow = existing.rows[0];

        if (existingRow && !['rejected', 'approved'].includes(existingRow.status)) {
            if (existingRow.status !== 'correction_needed') {
                // Cannot re-upload when pending or under_review
                await client.query('ROLLBACK');
                return { error: 'duplicate', existing: existingRow };
            }

            // Re-upload after correction_needed
            const historyEntry = {
                status: 'pending',
                changed_at: new Date().toISOString(),
                changed_by: memberName,
                remark: `Re-uploaded version ${existingRow.version + 1}`,
            };
            const updateRes = await client.query(
                `UPDATE matrimony_applications
                 SET uploaded_file_url = $1,
                     file_type = $2,
                     status = 'pending',
                     submitted_at = CURRENT_TIMESTAMP,
                     reviewed_by = NULL,
                     reviewed_at = NULL,
                     admin_remarks = NULL,
                     version = version + 1,
                     history = history || $3::jsonb
                 WHERE id = $4
                 RETURNING *`,
                [uploadedFileUrl, fileType, JSON.stringify([historyEntry]), existingRow.id]
            );
            await client.query('COMMIT');
            return { application: updateRes.rows[0], isReupload: true };
        }

        // Create brand new application
        const historyEntry = {
            status: 'pending',
            changed_at: new Date().toISOString(),
            changed_by: memberName,
            remark: 'Initial submission',
        };
        const insertRes = await client.query(
            `INSERT INTO matrimony_applications
             (member_id, membership_no, member_name, relation_to_hof,
              uploaded_by_name, uploaded_by_mobile, member_mobile,
              uploaded_file_url, file_type, status, history)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10::jsonb)
             RETURNING *`,
            [
                memberId, membershipNo, memberName, relationToHof,
                uploadedByName, uploadedByMobile, memberMobile,
                uploadedFileUrl, fileType,
                JSON.stringify([historyEntry]),
            ]
        );
        await client.query('COMMIT');
        return { application: insertRes.rows[0], isReupload: false };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Get the latest application for a specific family member.
 */
exports.getApplicationForMember = async (memberId, memberMobile) => {
    const res = await pool.query(
        `SELECT * FROM matrimony_applications
         WHERE member_id = $1 AND member_mobile = $2
         ORDER BY submitted_at DESC LIMIT 1`,
        [memberId, memberMobile || '']
    );
    return res.rows[0] || null;
};

/**
 * Get all applications for a membership number (all family members).
 */
exports.getApplicationsByMembership = async (memberId) => {
    const res = await pool.query(
        `SELECT * FROM matrimony_applications
         WHERE member_id = $1
         ORDER BY submitted_at DESC`,
        [memberId]
    );
    return res.rows;
};

/**
 * Get all applications (admin queue). Optional status filter.
 */
exports.getAllApplications = async ({ status = null, page = 1, limit = 50 } = {}) => {
    const offset = (page - 1) * limit;
    const params = [limit, offset];
    let where = '';
    if (status) {
        params.push(status);
        where = `WHERE a.status = $${params.length}`;
    }

    const res = await pool.query(
        `SELECT a.*,
                m.name AS hof_name,
                m.village, m.district, m.taluka, m.panchayat,
                m.mobile AS hof_mobile,
                m.profile_photo_url,
                m.family_members
         FROM matrimony_applications a
         JOIN members m ON m.membership_no = a.member_id
         ${where}
         ORDER BY
             CASE WHEN a.status = 'pending' THEN 1
                  WHEN a.status = 'under_review' THEN 2
                  WHEN a.status = 'correction_needed' THEN 3
                  WHEN a.status = 'approved' THEN 4
                  ELSE 5 END,
             a.submitted_at DESC
         LIMIT $1 OFFSET $2`,
        params
    );
    return res.rows;
};

/**
 * Get one application by id (for admin review).
 */
exports.getApplicationById = async (id) => {
    const res = await pool.query(
        `SELECT a.*,
                m.name AS hof_name,
                m.village, m.district, m.taluka, m.panchayat,
                m.mobile AS hof_mobile,
                m.profile_photo_url,
                m.family_members,
                m.address, m.head_gender, m.male, m.female
         FROM matrimony_applications a
         JOIN members m ON m.membership_no = a.member_id
         WHERE a.id = $1`,
        [id]
    );
    return res.rows[0] || null;
};

/**
 * Admin: Update the status of an application.
 * Appends to the history array automatically.
 */
exports.updateApplicationStatus = async (id, { status, adminRemarks, reviewedBy, checklist }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch current history
        const current = await client.query('SELECT history FROM matrimony_applications WHERE id = $1 FOR UPDATE', [id]);
        if (current.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const currentHistory = current.rows[0].history || [];
        const historyEntry = {
            status,
            changed_at: new Date().toISOString(),
            changed_by: reviewedBy,
            remark: adminRemarks || '',
        };
        const newHistory = [...currentHistory, historyEntry];

        const updateParams = [
            status,
            reviewedBy || null,
            adminRemarks || null,
            checklist ? JSON.stringify(checklist) : null,
            JSON.stringify(newHistory),
            id,
        ];

        const res = await client.query(
            `UPDATE matrimony_applications
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 admin_remarks = $3,
                 verification_checklist = COALESCE($4::jsonb, verification_checklist),
                 history = $5::jsonb
             WHERE id = $6
             RETURNING *`,
            updateParams
        );
        await client.query('COMMIT');
        return res.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Count pending applications (for admin dashboard badge).
 */
exports.countPending = async () => {
    const res = await pool.query(
        `SELECT COUNT(*) FROM matrimony_applications WHERE status IN ('pending', 'under_review')`
    );
    return parseInt(res.rows[0].count, 10);
};
