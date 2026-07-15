-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  home_airport TEXT,
  preferred_cabin TEXT DEFAULT 'economy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ
);

-- Credit cards database
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  issuer TEXT NOT NULL,
  network TEXT,
  annual_fee INTEGER,
  signup_bonus_points INTEGER,
  signup_bonus_spend_required INTEGER,
  category_multipliers JSONB DEFAULT '{}',
  transfer_partners JSONB DEFAULT '[]',
  affiliate_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's credit cards
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  date_opened DATE,
  annual_fee_posted DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Loyalty programs (airlines, hotels, banks)
CREATE TABLE loyalty_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('airline', 'hotel', 'bank')),
  alliance TEXT,
  point_valuation_cents NUMERIC(4,2),
  transfer_partners JSONB DEFAULT '[]',
  expiration_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's points balances
CREATE TABLE points_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  balance INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

-- Transfer rates between programs
CREATE TABLE transfer_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_program_id UUID REFERENCES loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  to_program_id UUID REFERENCES loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  ratio NUMERIC(4,2) DEFAULT 1.00,
  is_reversible BOOLEAN DEFAULT false,
  typical_timing TEXT,
  minimum_transfer INTEGER DEFAULT 1000,
  bonus_multiplier NUMERIC(3,2) DEFAULT 1.00,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_program_id, to_program_id)
);

-- Playbooks (premium feature)
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  steps JSONB DEFAULT '[]',
  best_option JSONB,
  alternatives JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Award searches cache
CREATE TABLE award_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  cabin TEXT DEFAULT 'economy',
  results JSONB DEFAULT '[]',
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_searches ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User cards policies
CREATE POLICY "Users can view own cards"
  ON user_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cards"
  ON user_cards FOR ALL
  USING (auth.uid() = user_id);

-- Points balances policies
CREATE POLICY "Users can view own balances"
  ON points_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own balances"
  ON points_balances FOR ALL
  USING (auth.uid() = user_id);

-- Playbooks policies
CREATE POLICY "Users can view own playbooks"
  ON playbooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own playbooks"
  ON playbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Award searches policies
CREATE POLICY "Users can view own searches"
  ON award_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create searches"
  ON award_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX idx_points_balances_user_id ON points_balances(user_id);
CREATE INDEX idx_playbooks_user_id ON playbooks(user_id);
CREATE INDEX idx_award_searches_user_id ON award_searches(user_id);
CREATE INDEX idx_transfer_rates_from ON transfer_rates(from_program_id);
CREATE INDEX idx_transfer_rates_to ON transfer_rates(to_program_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
