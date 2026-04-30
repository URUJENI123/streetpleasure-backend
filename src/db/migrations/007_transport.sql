CREATE TYPE transport_status AS ENUM ('open','matched','completed','cancelled');

CREATE TABLE transport_requests (
  id                   UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_or_activity_id UUID             NOT NULL,
  entity_type          chat_entity_type NOT NULL,
  requester_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_lat             DECIMAL(10,7)    NOT NULL,
  from_lon             DECIMAL(10,7)    NOT NULL,
  from_address         TEXT             NOT NULL,
  seats_needed         INT              NOT NULL DEFAULT 1,
  matched_group_id     UUID,
  status               transport_status NOT NULL DEFAULT 'open',
  created_at           TIMESTAMPTZ      DEFAULT NOW()
);

CREATE INDEX idx_transport_event ON transport_requests(event_or_activity_id);

CREATE TABLE transport_groups (
  id            UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID             NOT NULL,
  pickup_zone   TEXT,
  total_seats   INT              NOT NULL DEFAULT 0,
  fare_per_seat NUMERIC(10,2),
  status        transport_status NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE transport_group_members (
  group_id   UUID NOT NULL REFERENCES transport_groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  PRIMARY KEY (group_id, user_id)
);