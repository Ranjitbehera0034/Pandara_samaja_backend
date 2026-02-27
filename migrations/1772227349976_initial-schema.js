/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // Rather than rewriting the entire existing schema into node-pg-migrate builder methods,
    // we will execute raw SQL statements to establish the absolute baseline of your schema 
    // without losing or recreating anything that already exists.

    // 1. Members
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.members (
      membership_no VARCHAR(10) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      head_gender VARCHAR(10),
      mobile VARCHAR(15),
      male INTEGER,
      female INTEGER,
      district VARCHAR(50),
      taluka VARCHAR(50),
      panchayat VARCHAR(50),
      village VARCHAR(50),
      aadhar_no VARCHAR(12),
      family_members JSONB DEFAULT '[]'::jsonb,
      address TEXT,
      profile_photo_url TEXT,
      last_portal_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // 2. Users (Admin Auth)
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'super_admin', 'user')),
        is_mfa_active BOOLEAN DEFAULT false,
        mfa_secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

    // 3. Portal Posts
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.portal_posts (
      id SERIAL PRIMARY KEY,
      author_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      text_content TEXT,
      images TEXT[] DEFAULT '{}',
      location VARCHAR(255),
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_portal_posts_author ON portal_posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_portal_posts_created ON portal_posts(created_at DESC);
  `);

    // 4. Portal Messages, Likes, Comments, Notifications, etc.
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.portal_messages (
      id SERIAL PRIMARY KEY,
      sender_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      receiver_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      content TEXT NOT NULL,
      type VARCHAR(10) DEFAULT 'text',
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS public.portal_likes (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES portal_posts(id) ON DELETE CASCADE,
      member_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, member_id)
    );
    
    CREATE TABLE IF NOT EXISTS public.portal_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES portal_posts(id) ON DELETE CASCADE,
      member_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS public.portal_subscriptions (
      id SERIAL PRIMARY KEY,
      follower_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      following_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    );
    
    CREATE TABLE IF NOT EXISTS public.portal_photos (
      id SERIAL PRIMARY KEY,
      member_id VARCHAR(10) NOT NULL REFERENCES members(membership_no) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption VARCHAR(255),
      likes_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Note: Added IF NOT EXISTS manually across all these to allow `npm run migrate` to safely run 
    // on our existing live database without completely destroying existing data or throwing exceptions.
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // It's dangerous to drop the initial schema because it destroys everything, but for a complete rollback:
    pgm.sql(`
    DROP TABLE IF EXISTS public.portal_photos CASCADE;
    DROP TABLE IF EXISTS public.portal_subscriptions CASCADE;
    DROP TABLE IF EXISTS public.portal_comments CASCADE;
    DROP TABLE IF EXISTS public.portal_likes CASCADE;
    DROP TABLE IF EXISTS public.portal_messages CASCADE;
    DROP TABLE IF EXISTS public.portal_posts CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
    DROP TABLE IF EXISTS public.members CASCADE;
  `);
};
