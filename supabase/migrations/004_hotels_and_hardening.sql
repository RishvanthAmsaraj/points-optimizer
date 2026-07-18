-- Migration 004: hotel playbooks + hardening
--
-- 1) hotel_cache mirrors award_cache (003) for hotel award/cash lookups:
--    market data, shared by all authenticated users, ages out via expires_at.
-- 2) playbooks.type distinguishes flight vs hotel playbooks for history UIs.

CREATE TABLE hotel_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_code TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  guests INTEGER NOT NULL DEFAULT 2,
  results JSONB NOT NULL DEFAULT '[]',
  cash_price_usd NUMERIC(10,2),
  provider TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE hotel_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read hotel cache"
  ON hotel_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can write hotel cache"
  ON hotel_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_hotel_cache_lookup
  ON hotel_cache (city_code, check_in, check_out, rooms, expires_at);

ALTER TABLE playbooks
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'flight';
