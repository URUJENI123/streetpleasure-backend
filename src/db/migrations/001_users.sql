CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('unverified','verified_local','verified_tourist','host_guide','admin');

CREATE TABLE users (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number      VARCHAR(20) UNIQUE NOT NULL,
  role              user_role   NOT NULL DEFAULT 'unverified',
  national_id_hash  VARCHAR(255),
  passport_hash     VARCHAR(255),
  id_verified_at    TIMESTAMPTZ,
  liveness_url      TEXT,
  avatar_url        TEXT,
  full_name         VARCHAR(255),
  bio               TEXT,
  rating_avg        FLOAT       DEFAULT 0,
  total_ratings     INT         DEFAULT 0,
  fcm_token         TEXT,
  locked_at         TIMESTAMPTZ,
  lock_reason       TEXT,
  otp_code          VARCHAR(10),
  otp_expires_at    TIMESTAMPTZ,
  refresh_token     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role   ON users(role);