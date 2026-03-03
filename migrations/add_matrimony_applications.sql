-- =====================================================================
-- Migration: matrimony_applications table
-- Purpose: Tracks form-based matrimony registration requests from
--          portal members, with full status lifecycle & version history.
-- =====================================================================

CREATE TABLE IF NOT EXISTS matrimony_applications (
    id                   SERIAL PRIMARY KEY,
    member_id            VARCHAR(20) NOT NULL,          -- membership_no of the family (HoF)
    membership_no        VARCHAR(20) NOT NULL,
    member_name          VARCHAR(200) NOT NULL,
    relation_to_hof      VARCHAR(100) NOT NULL DEFAULT 'Self/Head',
    uploaded_by_name     VARCHAR(200),                  -- who physically submitted (HoF on behalf)
    uploaded_by_mobile   VARCHAR(20),
    uploaded_file_url    TEXT NOT NULL,                 -- Google Drive URL
    file_type            VARCHAR(10) DEFAULT 'jpg',     -- pdf | jpg | png
    status               VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- possible statuses: pending | under_review | approved | correction_needed | rejected
    submitted_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by          VARCHAR(100),                  -- admin username
    reviewed_at          TIMESTAMP,
    admin_remarks        TEXT,
    verification_checklist JSONB DEFAULT '{}',
    version              INTEGER NOT NULL DEFAULT 1,
    history              JSONB NOT NULL DEFAULT '[]',   -- array of {status, changed_at, changed_by, remark}
    member_mobile        VARCHAR(20),                   -- mobile of the applicant (may differ from HoF)
    CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES members(membership_no) ON DELETE CASCADE
);

-- Index for fast queue lookups
CREATE INDEX IF NOT EXISTS idx_matapp_status ON matrimony_applications(status);
CREATE INDEX IF NOT EXISTS idx_matapp_member  ON matrimony_applications(member_id);
CREATE INDEX IF NOT EXISTS idx_matapp_submitted ON matrimony_applications(submitted_at DESC);
