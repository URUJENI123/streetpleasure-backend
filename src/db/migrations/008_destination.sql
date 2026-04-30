CREATE TABLE destinations (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(100) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  region          VARCHAR(100),
  lat             DECIMAL(10,7),
  lon             DECIMAL(10,7),
  difficulty      VARCHAR(50),
  best_season     VARCHAR(100),
  permit_required BOOLEAN      DEFAULT FALSE,
  permit_info     TEXT,
  gear_list       TEXT[],
  image_url       TEXT,
  offline_map_url TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_destinations_slug ON destinations(slug);

