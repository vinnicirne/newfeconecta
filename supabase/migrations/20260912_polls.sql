-- =============================================================================
-- FéConecta — Módulo Enquetes
-- Migration: polls + poll_votes
-- =============================================================================

CREATE TABLE IF NOT EXISTS polls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL DEFAULT '[]',
  allow_multiple BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ NOT NULL,
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_author ON polls (author_id);
CREATE INDEX IF NOT EXISTS idx_polls_expires ON polls (expires_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes (user_id);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls_public_read" ON polls FOR SELECT USING (is_public = TRUE);
CREATE POLICY "polls_owner_insert" ON polls FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "polls_owner_delete" ON polls FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "votes_read" ON poll_votes FOR SELECT USING (TRUE);
CREATE POLICY "votes_self_write" ON poll_votes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
