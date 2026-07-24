-- ---------------------------------------------------------------------------
-- Market Mind initial schema (reconciled).
--
-- Replaces the previous three migrations, which were mutually conflicting:
-- 20240101000000 created user_settings with PK id while 20260721 re-declared
-- it with PK user_id (a silent IF NOT EXISTS no-op), and the settings API
-- queries/upserts on user_id. No database has ever had the old set applied,
-- so the clean fix is one coherent, correctly-keyed schema.
--
-- user_settings is keyed the way the code queries it: user_id PK.
-- All four tables carry RLS with per-operation auth.uid() = user_id policies.
-- ---------------------------------------------------------------------------

-- user_settings: one row per user, keyed by user_id (matches
-- app/api/user/settings/route.ts: .eq('user_id', ...) / onConflict 'user_id').
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level              text,
  investment_cap          numeric,
  execution_mode          text NOT NULL DEFAULT 'recommend' CHECK (execution_mode IN ('auto', 'recommend')),
  brokerage_connected     boolean NOT NULL DEFAULT false,
  encrypted_alpaca_key    text,
  encrypted_alpaca_secret text,
  updated_at              timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_update" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_delete" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- positions
CREATE TABLE IF NOT EXISTS public.positions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol        text NOT NULL,
  quantity      numeric NOT NULL,
  avg_cost      numeric NOT NULL,
  current_price numeric,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "positions_select" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "positions_insert" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_update" ON public.positions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_delete" ON public.positions FOR DELETE USING (auth.uid() = user_id);

-- trades
CREATE TABLE IF NOT EXISTS public.trades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          text NOT NULL,
  side            text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity        numeric NOT NULL,
  price           numeric NOT NULL,
  executed_at     timestamptz NOT NULL DEFAULT now(),
  alpaca_order_id text
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades_select" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update" ON public.trades FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_delete" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- signals
CREATE TABLE IF NOT EXISTS public.signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol      text NOT NULL,
  signal_type text NOT NULL,
  confidence  numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_select" ON public.signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "signals_insert" ON public.signals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signals_update" ON public.signals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signals_delete" ON public.signals FOR DELETE USING (auth.uid() = user_id);
