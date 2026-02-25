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
