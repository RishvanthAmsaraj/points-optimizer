-- Migration 005: Transfer promos, trip planning, experiences
--
-- 1) PROMO WINDOWS. bonus_multiplier existed but had no expiry, so a stale
--    30% bonus would inflate playbooks forever. Now a promo only counts when
--    it's inside its window, and we can name it in the UI.
-- 2) TRIPS. A trip is several components (flights, hotel nights, experiences)
--    funded from ONE points portfolio. Allocation across components is the
--    core planner problem — see src/lib/optimization/trip.ts.
-- 3) EXPERIENCE CACHE. Same shared market-data pattern as award_cache (003)
--    and hotel_cache (004).

-- ---------------------------------------------------------------------------
-- 1. Promo windows on transfer rates
-- ---------------------------------------------------------------------------

ALTER TABLE transfer_rates
  ADD COLUMN IF NOT EXISTS promo_name TEXT,
  ADD COLUMN IF NOT EXISTS promo_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN transfer_rates.promo_name IS
  'Human label for an active promo, e.g. "30% transfer bonus". NULL when none';
COMMENT ON COLUMN transfer_rates.promo_ends_at IS
  'When bonus_multiplier stops applying. NULL + multiplier>1 is treated as UNDATED and ignored by the engine, so stale promos cannot inflate playbooks';

CREATE INDEX IF NOT EXISTS idx_transfer_rates_promo
  ON transfer_rates (promo_ends_at)
  WHERE promo_ends_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Trips and their components
-- ---------------------------------------------------------------------------

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  -- Denormalized plan output so a saved trip renders without recomputation
  -- (award pricing shifts; the saved plan is a snapshot, clearly dated).
  plan JSONB NOT NULL DEFAULT '{}',
  total_points INTEGER NOT NULL DEFAULT 0,
  total_cash_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  value_captured_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_trips_user ON trips (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Experience cache
-- ---------------------------------------------------------------------------

CREATE TABLE experience_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'any',
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
