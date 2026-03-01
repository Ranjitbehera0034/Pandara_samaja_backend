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
