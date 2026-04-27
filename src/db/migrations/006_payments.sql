CREATE TYPE payment_method AS ENUM ('momo', 'stripe', 'flutterwave', 'free');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
CREATE TYPE payment_currency AS ENUM ('RWF', 'USD', 'EUR');

CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  amount            NUMERIC(12, 2) NOT NULL,
  currency          payment_currency NOT NULL DEFAULT 'RWF',
  method            payment_method NOT NULL,
  status            payment_status NOT NULL DEFAULT 'pending',
  provider_reference VARCHAR(255),
  provider_response  JSONB,
  escrow_release_at  TIMESTAMP,
  released_at        TIMESTAMP,
  refunded_at        TIMESTAMP,
  commission_amount  NUMERIC(12, 2),
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_event ON payments(event_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Add escrow FK to events
ALTER TABLE events ADD CONSTRAINT fk_event_escrow
  FOREIGN KEY (escrow_hold_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Add payment FK to event_attendees
ALTER TABLE event_attendees ADD CONSTRAINT fk_ea_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;