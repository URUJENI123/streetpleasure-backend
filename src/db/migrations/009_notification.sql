CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  entity_type VARCHAR(50),
  entity_id   UUID,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;