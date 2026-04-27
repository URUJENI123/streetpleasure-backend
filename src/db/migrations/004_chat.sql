CREATE TYPE chat_entity_type AS ENUM ('activity', 'event');

CREATE TABLE IF NOT EXISTS chats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  related_entity_type chat_entity_type NOT NULL,
  related_entity_id   UUID NOT NULL,
  expires_at          TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chats_entity ON chats(related_entity_type, related_entity_id);

CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  is_system  BOOLEAN DEFAULT FALSE,
  sent_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, sent_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Add foreign keys back to activities and events
ALTER TABLE activities ADD CONSTRAINT fk_activity_chat
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL;

ALTER TABLE events ADD CONSTRAINT fk_event_chat
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL;