CREATE TYPE report_reason AS ENUM ('scam', 'harassment', 'fake_event', 'dangerous_behaviour', 'no_show', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved', 'false_flag');
CREATE TYPE report_entity_type AS ENUM ('user', 'activity', 'event', 'message');

CREATE TABLE IF NOT EXISTS reports (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type              report_entity_type NOT NULL DEFAULT 'user',
  entity_id                UUID,
  reason                   report_reason NOT NULL,
  description              TEXT,
  evidence_urls            TEXT[],
  status                   report_status NOT NULL DEFAULT 'pending',
  reviewed_by              UUID REFERENCES users(id),
  reviewed_at              TIMESTAMP,
  police_packet_generated_at TIMESTAMP,
  police_packet_url        TEXT,
  sent_to_rnp_at           TIMESTAMP,
  created_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_reported_user ON reports(reported_user_id, created_at);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);