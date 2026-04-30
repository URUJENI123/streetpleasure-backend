CREATE TYPE payment_method   AS ENUM ('momo','stripe','flutterwave');
CREATE TYPE payment_status   AS ENUM ('pending','held','released','refunded','failed');
CREATE TYPE payment_currency AS ENUM ('RWF','USD','EUR');

CREATE TABLE payments (
  id                UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            NUMERIC(12,2)    NOT NULL,
  currency          payment_currency NOT NULL DEFAULT 'RWF',
  method            payment_method   NOT NULL,
  status            payment_status   NOT NULL DEFAULT 'pending',
  provider_ref      VARCHAR(255),
  escrow_release_at TIMESTAMPTZ,
  event_id          UUID             REFERENCES events(id) ON DELETE SET NULL,
  metadata          JSONB,
  created_at        TIMESTAMPTZ      DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      DEFAULT NOW()
);

CREATE INDEX idx_payments_user   ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_event  ON payments(event_id);