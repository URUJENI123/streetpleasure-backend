CREATE TYPE event_status AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  image_url       TEXT,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text    TEXT NOT NULL,
  start_time      TIMESTAMP NOT NULL,
  end_time        TIMESTAMP NOT NULL,
  capacity        INT NOT NULL DEFAULT 50,
  price           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency        VARCHAR(5) DEFAULT 'RWF',
  escrow_hold_id  UUID,
  carpool_meeting_point GEOGRAPHY(POINT, 4326),
  carpool_address TEXT,
  status          event_status NOT NULL DEFAULT 'draft',
  destination_id  UUID,
  chat_id         UUID,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_location ON events USING GIST(location);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start ON events(start_time);
CREATE INDEX idx_events_host ON events(host_id);

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paid          BOOLEAN DEFAULT FALSE,
  amount        NUMERIC(12, 2),
  payment_id    UUID,
  checked_in    BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP,
  qr_token      VARCHAR(255) UNIQUE,
  rating_given  INT CHECK (rating_given BETWEEN 1 AND 5),
  joined_at     TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_ea_user ON event_attendees(user_id);
CREATE INDEX idx_ea_qr ON event_attendees(qr_token);