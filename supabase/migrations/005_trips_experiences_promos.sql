-- Migration 005: Trip planner, experiences, promo windows, expiry tracking
--
-- Four additions, each backing a user-facing feature:
--   1. trips + trip_legs — multi-goal allocation (one points pool across a
--      flight + hotel + experience) so the same points are never counted twice.
--   2. experiences — curated redemption catalog (issuer experience programs,
--      hotel "moments"-style offers). No licensed API exists for these; the
--      catalog is our maintained asset. See docs/DATA_SOURCES.md.
--   3. transfer_rates.promo_* — transfer bonuses have START and END dates.
--      Storing the window turns bonus_multiplier into something we can alert
--      on and expire automatically instead of hand-editing.
--   4. points_balances.last_activity_at — powers points-at-risk warnings
--      (most programs expire points after N months of inactivity).

-- ---------------------------------------------------------------------------
-- 1. Trips (multi-goal planner)
--
-- NOTE: database.types.ts already declared `trips` and `experience_cache`,
-- but no migration ever created them (pre-existing inconsistency in the
-- repo — any query against either would have failed at runtime). This
-- migration creates both, matching the declared column shapes.
-- ---------------------------------------------------------------------------

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  -- Full allocation result: legs, per-leg funding plans, leftovers, totals.
  plan JSONB NOT NULL DEFAULT '{}',
  total_points INTEGER NOT NULL DEFAULT 0,
  total_cash_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  value_captured_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trips"
  ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trips"
  ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_trips_user ON trips (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Experiences catalog (public read, service-role write)
-- ---------------------------------------------------------------------------

CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  -- 'dining' | 'event' | 'tour' | 'wellness' | 'access' | 'transfer'
  category TEXT NOT NULL,
  city TEXT,
  city_code TEXT,
  country TEXT,
  -- Which program's points/portal books this (matches loyalty_programs.name)
  program_name TEXT NOT NULL,
  -- Booking channel label shown to users, e.g. "Amex Experiences",
  -- "Chase Experiences", "Marriott Bonvoy Moments", "Hyatt FIND"
  channel TEXT NOT NULL,
  points_required INTEGER,
  cash_price_usd NUMERIC(10,2),
  /* Fixed-value channels (portal-priced experiences) redeem at a published
     cents-per-point instead of a fixed points price. */
  fixed_cpp NUMERIC(5,2),
  booking_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  verified_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read experiences"
  ON experiences FOR SELECT USING (true);

CREATE INDEX idx_experiences_lookup
  ON experiences (city_code, category, is_active);
CREATE UNIQUE INDEX idx_experiences_unique
  ON experiences (name, program_name, city_code);

-- ---------------------------------------------------------------------------
-- 2b. Experience cache (shared market data, mirrors award_cache/hotel_cache)
-- ---------------------------------------------------------------------------

CREATE TABLE experience_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'all',
  results JSONB NOT NULL DEFAULT '[]',
  provider TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE experience_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read experience cache"
  ON experience_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write experience cache"
  ON experience_cache FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_experience_cache_lookup
  ON experience_cache (city_code, category, expires_at);

-- ---------------------------------------------------------------------------
-- 3. Transfer promo windows
-- ---------------------------------------------------------------------------

ALTER TABLE transfer_rates
  ADD COLUMN IF NOT EXISTS promo_starts_at DATE,
  ADD COLUMN IF NOT EXISTS promo_ends_at DATE,
  ADD COLUMN IF NOT EXISTS promo_name TEXT;

COMMENT ON COLUMN transfer_rates.promo_ends_at IS
  'Last day the bonus_multiplier applies. NULL = no active promo. The engine ignores bonus_multiplier outside the window.';

-- ---------------------------------------------------------------------------
-- 4. Balance activity (points-at-risk warnings)
-- ---------------------------------------------------------------------------

ALTER TABLE points_balances
  ADD COLUMN IF NOT EXISTS last_activity_at DATE;

COMMENT ON COLUMN points_balances.last_activity_at IS
  'User-reported date of last earn/redeem in this program. Drives expiration risk warnings; NULL = unknown, no warning shown.';
