-- Migration: Add head_gender field to members
-- Date: 2026-02-16
-- Description: Add head_gender column to track gender of the head of family.
--              The male/female counts now include the head of family.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS head_gender VARCHAR(10);

COMMENT ON COLUMN public.members.head_gender IS 'Gender of the head of family (Male/Female/Other). Included in male/female counts.';
-- Migration: Add additional member fields
-- Date: 2026-02-14
-- Description: Add aadhar_no, family_members (JSONB), and address columns to members table

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS aadhar_no    TEXT,
  ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS address       TEXT;

-- Optional: Index on aadhar_no for lookups
CREATE INDEX IF NOT EXISTS idx_members_aadhar_no ON public.members(aadhar_no);

COMMENT ON COLUMN public.members.aadhar_no IS 'Aadhaar number of head of family (12 digits)';
COMMENT ON COLUMN public.members.family_members IS 'JSON array of family members: [{name, relation, age}, ...]';
COMMENT ON COLUMN public.members.address IS 'Full address of the member';
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
-- Family Albums
CREATE TABLE IF NOT EXISTS portal_family_albums (
    id SERIAL PRIMARY KEY,
    family_head_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_family_album_photos (
    id SERIAL PRIMARY KEY,
    album_id INTEGER REFERENCES portal_family_albums(id) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family Events
CREATE TABLE IF NOT EXISTS portal_family_events (
    id SERIAL PRIMARY KEY,
    family_head_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_family_event_rsvps (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES portal_family_events(id) ON DELETE CASCADE,
    member_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- 'going', 'declined', 'maybe'
    UNIQUE(event_id, member_id)
);

-- Family Sub-Accounts (Credentials for family members)
CREATE TABLE IF NOT EXISTS portal_family_accounts (
    id SERIAL PRIMARY KEY,
    family_head_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community Events
CREATE TABLE IF NOT EXISTS portal_community_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    image_url VARCHAR(255),
    created_by VARCHAR(10) REFERENCES members(membership_no) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_community_event_rsvps (
    event_id INTEGER REFERENCES portal_community_events(id) ON DELETE CASCADE,
    member_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
    PRIMARY KEY(event_id, member_id)
);

-- Community Groups
CREATE TABLE IF NOT EXISTS portal_community_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy_level VARCHAR(50) DEFAULT 'public',
    created_by VARCHAR(10) REFERENCES members(membership_no) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_community_group_members (
    group_id INTEGER REFERENCES portal_community_groups(id) ON DELETE CASCADE,
    member_id VARCHAR(10) REFERENCES members(membership_no) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, member_id)
);
-- ═══════════════════════════════════════════════════════════════
--  PORTAL TABLES — Member login, posts, photos, likes, comments, subscriptions
--  Date: 2026-02-17
-- ═══════════════════════════════════════════════════════════════

-- 1. Member Login Tokens / Sessions
--    Members login with membership_no + mobile.
--    We store a refresh-style token reference so we can revoke if needed.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS last_portal_login TIMESTAMP;

-- 2. Community Posts (Feed)
CREATE TABLE IF NOT EXISTS portal_posts (
  id            SERIAL PRIMARY KEY,
  author_id     VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  text_content  TEXT,
  images        TEXT[] DEFAULT '{}',       -- array of image URLs
  location      VARCHAR(255),
  likes_count   INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_posts_author   ON portal_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_portal_posts_created   ON portal_posts(created_at DESC);

-- 3. Post Likes
CREATE TABLE IF NOT EXISTS portal_likes (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES portal_posts(id) ON DELETE CASCADE,
  member_id  VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_likes_post ON portal_likes(post_id);

-- 4. Post Comments
CREATE TABLE IF NOT EXISTS portal_comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES portal_posts(id) ON DELETE CASCADE,
  member_id  VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_comments_post ON portal_comments(post_id);

-- 5. Member Photos (Gallery)
CREATE TABLE IF NOT EXISTS portal_photos (
  id         SERIAL PRIMARY KEY,
  member_id  VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  caption    VARCHAR(255),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_photos_member ON portal_photos(member_id);

-- 6. Subscriptions (Follow)
CREATE TABLE IF NOT EXISTS portal_subscriptions (
  id            SERIAL PRIMARY KEY,
  follower_id   VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  following_id  VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_subs_follower  ON portal_subscriptions(follower_id);
CREATE INDEX IF NOT EXISTS idx_portal_subs_following ON portal_subscriptions(following_id);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS portal_notifications (
  id            SERIAL PRIMARY KEY,
  recipient_id  VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  actor_id      VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL, -- 'like', 'comment', 'follow', 'mention', 'system'
  post_id       INTEGER REFERENCES portal_posts(id) ON DELETE CASCADE,
  message       TEXT,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient ON portal_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_created ON portal_notifications(created_at DESC);
-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'super_admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ⚠️  NO DEFAULT ADMIN IS SEEDED HERE.
-- To create the first super_admin account, run:
--   ADMIN_USERNAME=yourname ADMIN_PASSWORD=<strong-password> node scripts/create-first-admin.js
