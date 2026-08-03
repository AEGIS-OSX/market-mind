-- ---------------------------------------------------------------------------
-- Order serialization + autonomous trading.
--
-- 1. order_locks — a per-user mutex.
--
--    Preflight reads live broker state (positions, equity, order counts) and
--    then submits. Between those two moments a second request could read the
--    same state and pass the same check, so both submit and the limit that
--    should have allowed one order allows two. The lock makes check-and-submit
--    atomic per user.
--
--    It is a lease, not a session lock: PostgREST runs every statement in its
--    own transaction over a pooled connection, so a pg_advisory_xact_lock
--    cannot be held across the several round-trips this needs, and a
--    session-level advisory lock on a pooled connection would leak onto
--    whoever gets that connection next. A row with an expiry is held across
--    HTTP calls safely and cannot outlive its expiry if a process dies.
--
--    Claimed by a single conditional UPDATE, which is atomic in Postgres:
--    concurrent updaters block on the row, then re-evaluate the WHERE against
--    the committed new version and match zero rows.
--
-- 2. broker_config.autonomous_enabled — deliberately here and NOT in
--    user_settings. user_settings is client-writable through PostgREST, so a
--    user could switch themselves into autonomous trading. broker_config has
--    zero client write policies.
--
-- 3. order_intents.dedupe_key — the guard against a cron that fires late,
--    twice, or in bursts. Enforced by a UNIQUE INDEX, so two concurrent runs
--    cannot both pass an in-code "have I already done this?" check.
-- ---------------------------------------------------------------------------

create table if not exists public.order_locks (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  token       uuid,
  acquired_at timestamptz,
  expires_at  timestamptz
);
alter table public.order_locks enable row level security;
-- No policies at all: service role only, like price_cache. A client that
-- could write here could steal or hold the mutex.

-- Autonomy switch. Service-role only by virtue of broker_config's policies.
alter table public.broker_config
  add column if not exists autonomous_enabled boolean not null default false;

-- Who placed it, so the UI can separate bot from human.
alter table public.order_intents
  add column if not exists placed_by text not null default 'human';

-- Deterministic per-signal key: symbol + side + the crossover date that
-- produced it. NULL for human orders, which are never deduped.
alter table public.order_intents
  add column if not exists dedupe_key text;

create unique index if not exists order_intents_user_dedupe_key
  on public.order_intents (user_id, dedupe_key)
  where dedupe_key is not null;
