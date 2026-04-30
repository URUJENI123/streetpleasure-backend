CREATE TYPE report_reason AS ENUM ('scam','harassment','fake_event','dangerous','no_show','other');
CREATE TYPE report_status AS ENUM ('pending','resolved','false_flag');
CREATE TYPE report_entity AS ENUM ('activity','event','user','message');

CREATE TABLE reports (
  id                         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id                UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type                report_entity NOT NULL,
  entity_id                  UUID          NOT NULL,
  reason                     report_reason NOT NULL,
  description                TEXT,
  status                     report_status NOT NULL DEFAULT 'pending',
  admin_note                 TEXT,
  police_packet_generated_at TIMESTAMPTZ,
  police_packet_url          TEXT,
  created_at                 TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_reports_reported_user ON reports(reported_user_id, created_at);
CREATE INDEX idx_reports_status        ON reports(status);