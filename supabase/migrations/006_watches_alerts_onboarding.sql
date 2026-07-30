-- Migration 006: Watches, alert delivery log, onboarding state
--
-- Backs the alerts engine (transfer bonuses, expiry, watched routes) and the
-- first-run experience. Everything here is user-scoped except alert_log,
-- which is written server-side by the digest job.

-- ---------------------------------------------------------------------------
-- 1. Watches — a saved route/city the user wants alerts about
-- ---------------------------------------------------------------------------

CREATE TABLE watches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'flight' | 'hotel' | 'program'
  kind TEXT NOT NULL DEFAULT 'flight',
  origin TEXT,
  destination TEXT,
  city_code TEXT,
  -- Watch a specific program for transfer bonuses (kind='program')
  program_id UUID REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  cabin TEXT DEFAULT 'economy',
  -- Alert when a redemption beats this many cents per point
  target_cpp NUMERIC(5,2),
  -- Alert when points needed drops below this
  max_points INTEGER,
  earliest_date DATE,
  latest_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watches"
  ON watches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watches"
  ON watches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watches"
  ON watches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watches"
  ON watches FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_watches_user ON watches (user_id, is_active);

-- ---------------------------------------------------------------------------
-- 2. Alert log — what we've told each user, so digests never repeat
-- ---------------------------------------------------------------------------

CREATE TABLE alert_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'transfer_bonus' | 'expiry' | 'watch_hit'
  alert_type TEXT NOT NULL,
  -- Stable key for dedupe, e.g. 'bonus:amex:virgin:2026-09-30'
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts"
  ON alert_log FOR SELECT USING (auth.uid() = user_id);

-- Writes come from the digest job using the service-role key (bypasses RLS).

CREATE UNIQUE INDEX idx_alert_log_dedupe
  ON alert_log (user_id, dedupe_key);
CREATE INDEX idx_alert_log_user ON alert_log (user_id, delivered_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Profile additions — alerts opt-in and onboarding state
-- ---------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
-- NOTE: home_airport and preferred_cabin already exist from migration 001.

COMMENT ON COLUMN profiles.home_airport IS
  'Default origin for reverse search and watches. 3-letter IATA code.';
