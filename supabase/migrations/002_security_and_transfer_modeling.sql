-- Migration 002: Security hardening + transfer-rate modeling upgrades
--
-- WHY THIS EXISTS
-- 1) SECURITY: cards, loyalty_programs, and transfer_rates were created WITHOUT
--    row level security. In Supabase, a table without RLS is readable AND
--    writable by anyone holding the public anon key (which ships in the
--    browser bundle). That means anyone could rewrite our transfer rates.
--    Fix: enable RLS, allow public SELECT only. Writes go through the
--    service-role key (seed scripts / admin tooling) which bypasses RLS.
-- 2) MODELING: real-world transfers are not simple ratios.
--    - Marriott -> airlines is 3:1 PLUS a 5,000-mile bonus for every 60,000
--      points transferred (block bonus).
--    - Transfers execute in fixed increments (usually 1,000 points).
--    - ratio needs more precision than NUMERIC(4,2) (3:1 = 0.3333).
--    These columns let the optimization engine compute exact source-side
--    point requirements for multi-hop chains.

-- ---------------------------------------------------------------------------
-- 1. Row level security on reference tables (public read, service-role write)
-- ---------------------------------------------------------------------------

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cards"
  ON cards FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read loyalty programs"
  ON loyalty_programs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read transfer rates"
  ON transfer_rates FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies on purpose: with RLS enabled and no
-- matching policy, anon/authenticated writes are denied. The service-role
-- key (used by seed scripts) bypasses RLS.

-- ---------------------------------------------------------------------------
-- 2. Transfer-rate modeling upgrades
-- ---------------------------------------------------------------------------

-- More precision for non-1:1 ratios (e.g. Marriott -> airline at 3:1).
-- Semantics: ratio = destination units received per 1 source unit.
--   Chase -> United 1:1        => ratio 1.0000
--   Amex  -> Hilton 1:2        => ratio 2.0000
--   Marriott -> airlines 3:1   => ratio 0.3333 (+ block bonus below)
ALTER TABLE transfer_rates
  ALTER COLUMN ratio TYPE NUMERIC(8, 4);

-- Block bonus: every `block_size` source points transferred yields an extra
-- `block_bonus` destination points (Marriott: block_size 60000, bonus 5000).
-- 0 = no block bonus.
ALTER TABLE transfer_rates
  ADD COLUMN IF NOT EXISTS block_size INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_bonus INTEGER NOT NULL DEFAULT 0;

-- Transfers execute in fixed increments (almost always 1,000).
ALTER TABLE transfer_rates
  ADD COLUMN IF NOT EXISTS increment INTEGER NOT NULL DEFAULT 1000;

COMMENT ON COLUMN transfer_rates.ratio IS
  'Destination units received per 1 source unit (before block bonuses / promos)';
COMMENT ON COLUMN transfer_rates.bonus_multiplier IS
  'Temporary promotional multiplier applied to ratio (e.g. 1.30 during a 30% transfer bonus). 1.00 = no promo';
COMMENT ON COLUMN transfer_rates.block_size IS
  'Source points per bonus block (e.g. 60000 for Marriott). 0 = none';
COMMENT ON COLUMN transfer_rates.block_bonus IS
  'Extra destination points granted per full block (e.g. 5000 for Marriott)';

-- ---------------------------------------------------------------------------
-- 3. Award-search cache lookup index
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_award_searches_lookup
  ON award_searches (origin, destination, departure_date, cabin, expires_at);
