CREATE TYPE event_status AS ENUM ('draft','published','ongoing','completed','cancelled');

CREATE TABLE events (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  lat           DECIMAL(10,7) NOT NULL,
  lon           DECIMAL(10,7) NOT NULL,
  address_text  TEXT          NOT NULL,
  start_time    TIMESTAMPTZ   NOT NULL,
  end_time      TIMESTAMPTZ   NOT NULL,
  capacity      INT           NOT NULL,
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency      VARCHAR(3)    NOT NULL DEFAULT 'RWF',
  escrow_id     UUID,
  status        event_status  NOT NULL DEFAULT 'draft',
  image_url     TEXT,
  carpool_lat   DECIMAL(10,7),
  carpool_lon   DECIMAL(10,7),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_events_lat_lon ON events(lat, lon);
CREATE INDEX idx_events_status  ON events(status);
CREATE INDEX idx_events_start   ON events(start_time);

CREATE TABLE event_attendees (
  event_id     UUID          NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paid         BOOLEAN       DEFAULT FALSE,
  amount       NUMERIC(12,2),
  payment_id   UUID,
  checked_in   BOOLEAN       DEFAULT FALSE,
  rating_given INT,
  ticket_code  VARCHAR(64)   UNIQUE,
  joined_at    TIMESTAMPTZ   DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);