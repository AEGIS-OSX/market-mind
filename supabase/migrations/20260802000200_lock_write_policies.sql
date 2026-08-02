-- Integrity lock: users can no longer write trades/positions directly via
-- PostgREST. Cash accounting now depends on those rows, so a client-side
-- insert would let a user forge fills and P&L. All mutations go through the
-- service role in the server routes; SELECT policies are unchanged.
--
-- APPLY ONLY AFTER the service-role trade path (feat/data-layer) is deployed.
-- Applying it against the older build breaks POST /api/trade{,/execute},
-- which still insert via the session client.

drop policy if exists trades_insert on trades;
drop policy if exists trades_update on trades;
drop policy if exists trades_delete on trades;

drop policy if exists positions_insert on positions;
drop policy if exists positions_update on positions;
drop policy if exists positions_delete on positions;
