-- ---------------------------------------------------------------------------
-- Broker safety layer.
--
-- No broker integration exists yet and no broker credentials are present.
-- These tables are the gate that must be satisfied BEFORE any such
-- integration is allowed to act, plus the mirror tables its state would land
-- in once it does.
--
-- TRUST MODEL, identical to price_cache/bars_cache: RLS is ON for all seven
-- tables, each gets exactly ONE policy -- an owner SELECT -- and ZERO
-- insert/update/delete policies. A user may read their own safety config and
-- their own audit trail; they may not write any of it through PostgREST. The
-- only writer is the service role in the server routes. A user who could
-- write broker_config could raise their own limits or flip their own kill
-- switch, which would make the entire layer decorative.
--
-- Every limit column is deliberately NULLABLE and every one starts NULL.
-- lib/broker/preflight.ts treats a NULL limit as REFUSE, never as unlimited,
-- so a freshly created row is inert until each limit is set explicitly.
-- ---------------------------------------------------------------------------

-- Per-user broker safety configuration. One row per user.
create table if not exists public.broker_config (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  mode                    text not null default 'sim' check (mode in ('sim', 'paper', 'live')),
  live_enabled            boolean not null default false,
  kill_switch_active      boolean not null default false,
  max_order_notional      numeric,
  max_position_notional   numeric,
  max_position_pct_equity numeric,
  max_daily_loss          numeric,
  max_orders_per_day      integer,
  max_orders_per_minute   integer,
  limit_band_pct          numeric,
  updated_by              uuid,
  updated_at              timestamptz not null default now()
);
alter table public.broker_config enable row level security;
drop policy if exists broker_config_select on public.broker_config;
create policy broker_config_select on public.broker_config
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Symbol allowlist. Starts EMPTY: an account with no allowlist can trade
-- nothing, which is the correct default for a layer that is not yet wired.
create table if not exists public.allowed_symbols (
  user_id  uuid not null references auth.users(id) on delete cascade,
  symbol   text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, symbol)
);
alter table public.allowed_symbols enable row level security;
drop policy if exists allowed_symbols_select on public.allowed_symbols;
create policy allowed_symbols_select on public.allowed_symbols
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Intent to place an order, recorded BEFORE anything is sent anywhere.
-- client_order_id is unique so a retry can never double-submit.
create table if not exists public.order_intents (
  id              uuid primary key default gen_random_uuid(),
  client_order_id text not null unique,
  user_id         uuid not null references auth.users(id) on delete cascade,
  mode            text not null check (mode in ('sim', 'paper', 'live')),
  symbol          text not null,
  side            text not null check (side in ('buy', 'sell')),
  qty             numeric not null,
  limit_price     numeric,
  state           text not null,
  broker_order_id text,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists order_intents_user_created_idx
  on public.order_intents (user_id, created_at desc);
alter table public.order_intents enable row level security;
drop policy if exists order_intents_select on public.order_intents;
create policy order_intents_select on public.order_intents
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Mirror of broker-side orders. Every row carries user_id and mode so a
-- paper row can never be read as a live row.
create table if not exists public.broker_orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mode            text not null check (mode in ('sim', 'paper', 'live')),
  broker_order_id text not null,
  client_order_id text,
  symbol          text not null,
  side            text not null,
  qty             numeric,
  filled_qty      numeric,
  avg_fill_price  numeric,
  status          text,
  submitted_at    timestamptz,
  filled_at       timestamptz,
  raw             jsonb,
  synced_at       timestamptz not null default now(),
  unique (user_id, mode, broker_order_id)
);
alter table public.broker_orders enable row level security;
drop policy if exists broker_orders_select on public.broker_orders;
create policy broker_orders_select on public.broker_orders
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Mirror of broker-side positions.
create table if not exists public.broker_positions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mode            text not null check (mode in ('sim', 'paper', 'live')),
  symbol          text not null,
  qty             numeric not null,
  avg_entry_price numeric,
  market_value    numeric,
  unrealized_pnl  numeric,
  raw             jsonb,
  synced_at       timestamptz not null default now(),
  unique (user_id, mode, symbol)
);
alter table public.broker_positions enable row level security;
drop policy if exists broker_positions_select on public.broker_positions;
create policy broker_positions_select on public.broker_positions
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Point-in-time mirror of the broker account (equity drives the
-- max_position_pct_equity and max_daily_loss checks).
create table if not exists public.broker_account_snapshots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  mode         text not null check (mode in ('sim', 'paper', 'live')),
  equity       numeric,
  cash         numeric,
  buying_power numeric,
  raw          jsonb,
  captured_at  timestamptz not null default now()
);
create index if not exists broker_account_snapshots_user_captured_idx
  on public.broker_account_snapshots (user_id, mode, captured_at desc);
alter table public.broker_account_snapshots enable row level security;
drop policy if exists broker_account_snapshots_select on public.broker_account_snapshots;
create policy broker_account_snapshots_select on public.broker_account_snapshots
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Append-only audit trail. Every preflight refusal lands here with its
-- reason. Readable by its owner, writable by nobody but the service role --
-- a user who could delete their own audit rows has no audit trail.
create table if not exists public.broker_audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event      text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists broker_audit_log_user_created_idx
  on public.broker_audit_log (user_id, created_at desc);
alter table public.broker_audit_log enable row level security;
drop policy if exists broker_audit_log_select on public.broker_audit_log;
create policy broker_audit_log_select on public.broker_audit_log
  for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies
