-- Initial schema for market-mind trading platform
-- Tables: user_settings, positions, trades, signals
-- All tables have RLS enabled with policies scoped to auth.uid()

-- user_settings: one row per user, stores risk preferences and encrypted API keys
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level text,
  investment_cap numeric,
  encrypted_alpaca_key text,
  encrypted_alpaca_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_settings_user_id_unique UNIQUE (user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_own"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- positions: current holdings per user
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  current_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "positions_select_own"
  ON positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "positions_insert_own"
  ON positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_update_own"
  ON positions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_delete_own"
  ON positions FOR DELETE
  USING (auth.uid() = user_id);

-- trades: executed trade history per user
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity numeric NOT NULL,
  price numeric,
  executed_at timestamptz DEFAULT now(),
  alpaca_order_id text
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades_select_own"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trades_insert_own"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trades_update_own"
  ON trades FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trades_delete_own"
  ON trades FOR DELETE
  USING (auth.uid() = user_id);

-- signals: AI-generated trading signals per user
CREATE TABLE IF NOT EXISTS signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  signal_type text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signals_select_own"
  ON signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "signals_insert_own"
  ON signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "signals_update_own"
  ON signals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "signals_delete_own"
  ON signals FOR DELETE
  USING (auth.uid() = user_id);
