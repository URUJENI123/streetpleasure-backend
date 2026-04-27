CREATE TYPE activity_type AS ENUM ('club', 'hike', 'sports', 'meal', 'movie', 'concert', 'other');
CREATE TYPE activity_status AS ENUM ('open', 'full', 'cancelled', 'completed');

CREATE TABLE IF NOT EXISTS activities (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  activity_type    activity_type NOT NULL DEFAULT 'other',
  location         GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text     TEXT NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,
  max_participants INT NOT NULL DEFAULT 6,
  status           activity_status NOT NULL DEFAULT 'open',
  chat_id          UUID,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_location ON activities USING GIST(location);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scheduled ON activities(scheduled_at);
CREATE INDEX idx_activities_creator ON activities(creator_id);

CREATE TABLE IF NOT EXISTS activity_participants (
  activity_id  UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMP DEFAULT NOW(),
  checked_in   BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP,
  rating_given INT CHECK (rating_given BETWEEN 1 AND 5),
  PRIMARY KEY (activity_id, user_id)
);

CREATE INDEX idx_ap_user ON activity_participants(user_id);