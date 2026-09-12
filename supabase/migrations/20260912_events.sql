-- =============================================================================
-- FéConecta — Módulo Eventos
-- Migration: events + event_attendees
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  location      TEXT,
  online_link   TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'going'
               CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_events_author    ON events (author_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at);
CREATE INDEX IF NOT EXISTS idx_attendees_event  ON event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user   ON event_attendees (user_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON events FOR SELECT USING (is_public = TRUE);
CREATE POLICY "events_owner_read_private" ON events FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "events_owner_insert" ON events FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "events_owner_update" ON events FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "events_owner_delete" ON events FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "attendees_read" ON event_attendees FOR SELECT USING (TRUE);
CREATE POLICY "attendees_self_write" ON event_attendees FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
