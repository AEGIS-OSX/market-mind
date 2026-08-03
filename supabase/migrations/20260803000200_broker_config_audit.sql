-- ---------------------------------------------------------------------------
-- Audit the safeguards themselves.
--
-- 20260803000100 made broker_audit_log record every preflight REFUSAL, but
-- nothing recorded changes to the safety config that produces those verdicts.
-- Enabling live mode, widening a limit, or clearing the kill switch left no
-- trace: updated_at had no trigger so it never moved, and updated_by was set
-- by nothing.
--
-- This is done with triggers rather than application code on purpose. A
-- trigger fires for the service role, for a psql session, for a future cron,
-- and for any writer that does not exist yet. Application-side auditing only
-- covers the one code path that remembers to call it, and the whole point of
-- an audit trail is to cover the paths nobody remembered.
-- ---------------------------------------------------------------------------

-- 1. updated_at that actually moves.
create or replace function public.broker_config_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists broker_config_touch_updated_at on public.broker_config;
create trigger broker_config_touch_updated_at
  before update on public.broker_config
  for each row
  execute function public.broker_config_touch_updated_at();

-- 2. Mutation audit shared by broker_config and allowed_symbols.
--
-- The event name arrives as a trigger argument so one function serves both
-- tables. On UPDATE the detail carries ONLY the columns whose value actually
-- changed, each with its old and new value -- not the whole row, which would
-- bury the one field that moved. On INSERT and DELETE there is no diff to
-- take, so the row itself is the record of what appeared or disappeared.
--
-- SECURITY DEFINER: broker_audit_log has RLS on and zero write policies, so
-- the insert must not depend on the caller's privileges. This also means the
-- audit still lands if a future writer is a non-bypassing role.
create or replace function public.broker_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event   text := tg_argv[0];
  v_user    uuid;
  v_old     jsonb;
  v_new     jsonb;
  v_changed jsonb := '{}'::jsonb;
  v_detail  jsonb;
  k         text;
begin
  if tg_op = 'DELETE' then
    v_user := old.user_id;
  else
    v_user := new.user_id;
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);

    for k in select jsonb_object_keys(v_new)
    loop
      if (v_old -> k) is distinct from (v_new -> k) then
        v_changed := v_changed || jsonb_build_object(
          k, jsonb_build_object('old', v_old -> k, 'new', v_new -> k)
        );
      end if;
    end loop;

    -- An UPDATE that changed nothing is not an event worth recording.
    if v_changed = '{}'::jsonb then
      return null;
    end if;

    v_detail := jsonb_build_object(
      'operation', tg_op,
      'table', tg_table_name,
      'changed', v_changed
    );
  elsif tg_op = 'INSERT' then
    v_detail := jsonb_build_object(
      'operation', tg_op,
      'table', tg_table_name,
      'row', to_jsonb(new)
    );
  else
    v_detail := jsonb_build_object(
      'operation', tg_op,
      'table', tg_table_name,
      'row', to_jsonb(old)
    );
  end if;

  begin
    insert into public.broker_audit_log (user_id, event, detail)
    values (v_user, v_event, v_detail);
  exception
    -- Deleting an auth.users row cascades into broker_config and
    -- allowed_symbols; the audit row would then reference a user that is
    -- being removed in the same statement. Losing the audit trail of an
    -- account that no longer exists is acceptable; blocking account deletion
    -- is not.
    when foreign_key_violation then
      null;
  end;

  return null;
end;
$$;

drop trigger if exists broker_config_audit on public.broker_config;
create trigger broker_config_audit
  after insert or update or delete on public.broker_config
  for each row
  execute function public.broker_audit_mutation('config_changed');

drop trigger if exists allowed_symbols_audit on public.allowed_symbols;
create trigger allowed_symbols_audit
  after insert or update or delete on public.allowed_symbols
  for each row
  execute function public.broker_audit_mutation('allowlist_changed');

-- 3. broker_audit_log write policies are unchanged: there are none, and none
--    are added here. Clients read their own trail and can neither forge nor
--    erase it; the trigger writes as definer, not as the caller.
