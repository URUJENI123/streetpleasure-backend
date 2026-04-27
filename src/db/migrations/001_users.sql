-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum types
CREATE TYPE user_role AS ENUM ('unverified', 'verified_local', 'verified_tourist', 'host_guide', 'admin');

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number      VARCHAR(20) UNIQUE NOT NULL,
  role              user_role NOT NULL DEFAULT 'unverified',
  national_id_hash  VARCHAR(255),
  passport_hash     VARCHAR(255),
  id_verified_at    TIMESTAMP,
  liveness_photo_url TEXT,
  profile_picture_url TEXT,
  full_name         VARCHAR(255),
  date_of_birth     DATE,
  rating_avg        FLOAT DEFAULT 0,
  total_ratings     INT DEFAULT 0,
  fcm_token         TEXT,
  locked_at         TIMESTAMP,
  lock_reason       TEXT,
  insurance_proof_url TEXT,
  preferred_lang    VARCHAR(5) DEFAULT 'en',
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- OTP table
CREATE TABLE IF NOT EXISTS otp_codes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  code         VARCHAR(10) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  used         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone_number);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);