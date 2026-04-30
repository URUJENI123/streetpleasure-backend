CREATE TYPE chat_entity_type AS ENUM ('activity','event');

CREATE TABLE chats (
  id                  UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  related_entity_type chat_entity_type NOT NULL,
  related_entity_id   UUID             NOT NULL,
  expires_at          TIMESTAMPTZ      NOT NULL,
  created_at          TIMESTAMPTZ      DEFAULT NOW()
);

CREATE INDEX idx_chats_entity ON chats(related_entity_type, related_entity_id);

CREATE TABLE messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  sent_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, sent_at);