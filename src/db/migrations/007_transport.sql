CREATE TYPE transport_status AS ENUM ('open', 'matched', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS transport_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_or_activity_id  UUID NOT NULL,
  entity_type           VARCHAR(20) NOT NULL CHECK (entity_type IN ('activity', 'event')),
  requester_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_location         GEOGRAPHY(POINT, 4326) NOT NULL,
  from_address          TEXT NOT NULL,
  seats_needed          INT NOT NULL DEFAULT 1,
  matched_group_id      UUID,
  status                transport_status NOT NULL DEFAULT 'open',
  split_fare_rwf        NUMERIC(12, 2),
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transport_event ON transport_requests(event_or_activity_id);
CREATE INDEX idx_transport_location ON transport_requests USING GIST(from_location);
CREATE INDEX idx_transport_group ON transport_requests(matched_group_id);

CREATE TABLE IF NOT EXISTS transport_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id     UUID NOT NULL,
  entity_type   VARCHAR(20) NOT NULL,
  pickup_zone   GEOGRAPHY(POINT, 4326),
  pickup_address TEXT,
  total_seats   INT DEFAULT 0,
  fare_per_seat NUMERIC(12, 2),
  status        transport_status NOT NULL DEFAULT 'open',
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Adventure destinations
CREATE TABLE IF NOT EXISTS destinations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  description     TEXT,
  location        GEOGRAPHY(POINT, 4326),
  address_text    TEXT,
  difficulty      VARCHAR(50),
  best_season     TEXT,
  permit_required BOOLEAN DEFAULT FALSE,
  permit_info     TEXT,
  gear_list       TEXT[],
  image_urls      TEXT[],
  offline_map_url TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);

INSERT INTO destinations (name, slug, description, location, address_text, difficulty, permit_required, best_season, gear_list) VALUES
('Volcanoes National Park', 'volcanoes-np', 'Home of the mountain gorillas and the Virunga volcanoes. One of the most iconic conservation areas in Africa.', ST_SetSRID(ST_MakePoint(29.5167, -1.4833), 4326), 'Musanze, Northern Province, Rwanda', 'Moderate–Hard', TRUE, 'June–September, December–February', ARRAY['Hiking boots', 'Rain jacket', 'Long sleeves', 'Gloves', 'Gaiters']),
('Nyungwe Forest National Park', 'nyungwe-np', 'Ancient montane rainforest with chimpanzee trekking and a famous canopy walkway.', ST_SetSRID(ST_MakePoint(29.1667, -2.5000), 4326), 'Nyamasheke, Western Province, Rwanda', 'Moderate', TRUE, 'June–September', ARRAY['Hiking boots', 'Insect repellent', 'Rain jacket', 'Binoculars']),
('Akagera National Park', 'akagera-np', 'Rwanda''s only savannah park. Home to the Big Five including recently reintroduced rhinos and lions.', ST_SetSRID(ST_MakePoint(30.7500, -1.8833), 4326), 'Eastern Province, Rwanda', 'Easy', FALSE, 'June–September', ARRAY['Sunscreen', 'Hat', 'Binoculars', 'Camera', 'Light layers']),
('Lake Kivu - Congo Nile Trail', 'lake-kivu-cnt', 'A 227km trail along Lake Kivu passing through fishing villages, tea estates, and volcanic scenery.', ST_SetSRID(ST_MakePoint(29.2500, -2.0000), 4326), 'Western Province, Rwanda', 'Moderate–Hard', FALSE, 'June–September', ARRAY['Cycling or hiking gear', 'Rain jacket', 'Sunscreen', 'Water purification']),
('Gishwati-Mukura National Park', 'gishwati-mukura-np', 'Rwanda''s newest national park featuring chimpanzee trekking and stunning landscapes between Lake Kivu and the Congo Nile Trail.', ST_SetSRID(ST_MakePoint(29.5167, -1.9167), 4326), 'Western Province, Rwanda', 'Moderate', TRUE, 'Year-round', ARRAY['Hiking boots', 'Rain jacket', 'Insect repellent']);