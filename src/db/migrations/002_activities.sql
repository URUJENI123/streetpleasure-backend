CREATE TYPE activity_type   AS ENUM ('club','hike','sports','meal','movie','adventure','other');
CREATE TYPE activity_status AS ENUM ('open','full','cancelled','completed');

CREATE TABLE activities (
  id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255)    NOT NULL,
  description      TEXT,
  activity_type    activity_type   NOT NULL,
  lat              DECIMAL(10,7)   NOT NULL,
  lon              DECIMAL(10,7)   NOT NULL,
  address_text     TEXT            NOT NULL,
  scheduled_at     TIMESTAMPTZ     NOT NULL,
  max_participants INT             NOT NULL DEFAULT 6,
  status           activity_status NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_activities_lat_lon ON activities(lat, lon);
CREATE INDEX idx_activities_status  ON activities(status);
CREATE INDEX idx_activities_sched   ON activities(scheduled_at);

CREATE TABLE activity_participants (
  activity_id  UUID        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  checked_in   BOOLEAN     DEFAULT FALSE,
  rating_given INT,
  PRIMARY KEY (activity_id, user_id)
);