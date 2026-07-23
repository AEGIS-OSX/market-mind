-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level text,
  investment_cap numeric,
  encrypted_alpaca_key text,
  encrypted_alpaca_secret text
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "user_settings_delete" ON user_settings FOR DELETE USING (auth.uid() = id);

-- positions
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  quantity numeric NOT NULL,
  avg_cost numeric NOT NULL,
  current_price numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "positions_select" ON positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "positions_insert" ON positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_update" ON positions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_delete" ON positions FOR DELETE USING (auth.uid() = user_id);

-- trades
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  executed_at timestamptz DEFAULT now(),
  alpaca_order_id text
);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades_select" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update" ON trades FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_delete" ON trades FOR DELETE USING (auth.uid() = user_id);

-- signals
CREATE TABLE IF NOT EXISTS signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  signal_type text NOT NULL,
  confidence numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_select" ON signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "signals_insert" ON signals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signals_update" ON signals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signals_delete" ON signals FOR DELETE USING (auth.uid() = user_id);
