-- Add otp columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
