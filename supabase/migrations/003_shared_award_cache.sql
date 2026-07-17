-- Migration 003: Shared award-availability cache
--
-- WHY: the playbook API cached provider results in award_searches, but that
-- table's RLS policy scopes reads to the row's owner (auth.uid() = user_id).
-- Result: user B could never reuse user A's cached search, so the "6-hour
-- cache" only worked per-user — burning provider quota for identical
-- queries. Award availability is market data, not personal data, so it gets
-- its own table with no user attribution at all.
--
-- award_searches remains for potential per-user search history features.

CREATE TABLE award_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  cabin TEXT NOT NULL DEFAULT 'economy',
  results JSONB NOT NULL DEFAULT '[]',
  provider TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE award_cache ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read and contribute to the shared cache. No
-- UPDATE/DELETE policies: rows age out via expires_at, and stale rows can be
-- purged by a service-role cron later.
CREATE POLICY "Authenticated users can read award cache"
  ON award_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can write award cache"
  ON award_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_award_cache_lookup
  ON award_cache (origin, destination, departure_date, cabin, expires_at);
