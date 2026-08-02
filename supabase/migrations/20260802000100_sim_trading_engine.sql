-- Simulated trading engine: accounts (simulated cash), shared market-data
-- caches, and trade provenance columns.
--
-- ADDITIVE ONLY. The companion migration 20260802000200 tightens write
-- policies and must be applied only AFTER the service-role code path is
-- deployed (the pre-existing routes insert trades via the session client).

-- Simulated cash balance. Reads are user-scoped; ALL writes go through the
-- service role (server routes) so a user cannot set their own balance.
create table if not exists accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash numeric not null,
  starting_cash numeric not null,
  created_at timestamptz not null default now()
);
alter table accounts enable row level security;
drop policy if exists accounts_select on accounts;
create policy accounts_select on accounts for select using (auth.uid() = user_id);
-- deliberately no insert/update/delete policies

-- Shared quote cache. NO policies at all: only the service role touches it.
-- If authenticated users could write here they could poison prices served to
-- every other user -- the worst possible failure for this app.
create table if not exists price_cache (
  symbol text primary key,
  price numeric not null,
  as_of timestamptz not null,
  source text not null,
  freshness text not null,
  fetched_at timestamptz not null default now()
);
alter table price_cache enable row level security;

-- Shared daily-bars cache (signals input). Same trust model as price_cache.
create table if not exists bars_cache (
  symbol text primary key,
  bars jsonb not null,
  source text not null,
  fetched_at timestamptz not null default now()
);
alter table bars_cache enable row level security;

-- Trade provenance: where the fill price came from and when it was true.
alter table trades add column if not exists price_source text;
alter table trades add column if not exists price_as_of timestamptz;
alter table trades add column if not exists realized_pnl numeric;

-- Upsert target for position mutation.
create unique index if not exists positions_user_symbol_key on positions(user_id, symbol);
