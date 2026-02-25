-- ═══════════════════════════════════════════════════════════════
--  CHAT TABLES — Direct messages between portal members
--  Date: 2026-02-22
-- ═══════════════════════════════════════════════════════════════

-- 1. Direct Messages
CREATE TABLE IF NOT EXISTS portal_messages (
  id          SERIAL PRIMARY KEY,
  sender_id   VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  receiver_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  type        VARCHAR(10) DEFAULT 'text',  -- 'text', 'image', 'file'
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_sender   ON portal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_receiver ON portal_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_pair     ON portal_messages(sender_id, receiver_id, created_at DESC);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS portal_notifications (
  id          SERIAL PRIMARY KEY,
  member_id   VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL,  -- 'like', 'comment', 'follow', 'mention', 'system'
  actor_id    VARCHAR(10) REFERENCES members(membership_no) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  post_id     INTEGER REFERENCES portal_posts(id) ON DELETE CASCADE,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_notif_member ON portal_notifications(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_notif_unread ON portal_notifications(member_id) WHERE read = FALSE;
