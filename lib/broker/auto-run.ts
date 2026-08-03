import "server-only";
import { getServiceClient } from "@/lib/api/serviceRole";
import { resolveAlpacaClient, type AlpacaClient } from "@/lib/broker/alpaca";
import { reconcile } from "@/lib/broker/reconcile";
import { submitOrder } from "@/lib/broker/submit-order";
import { getDailyBars, getQuote } from "@/lib/api/marketData";
import { computeSignal, SIGNAL_RULE_TEXT } from "@/lib/signals-rule";

// Autonomous paper trading.
//
// The strategy is the existing SMA 20/50 crossover in lib/signals-rule.ts,
// unchanged and uninvented. This file decides nothing about markets; it
// decides when it is allowed to act on what that module already says.
//
// Every run is safe to skip and safe to repeat. GitHub's scheduler is
// best-effort -- the first scheduled run of the reconciler arrived 73 minutes
// after the workflow landed, having silently passed over fourteen slots -- so
// nothing here may assume a cadence, and a burst of late runs must not turn
// one signal into several orders. That is what the dedupe key is for, and it
// is enforced by a UNIQUE INDEX rather than by a check in this file, because
// two runs firing together would both pass a check in this file.
//
// Autonomous orders take the ordinary path: the same submitOrder, the same
// full preflight, the same lock, the same limits. There is no bypass.

export interface AutoRunAccountResult {
  user_id: string;
  skipped?: string;
  mode?: string;
  rule?: string;
  reconciled?: Record<string, unknown>;
  evaluated?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
}

async function audit(userId: string, event: string, detail: Record<string, unknown>) {
  const svc = getServiceClient();
  if (!svc) return;
  try {
    await svc.from("broker_audit_log").insert({ user_id: userId, event, detail });
  } catch {
    /* best-effort */
  }
}

export async function autoRunAllAccounts(): Promise<{
  ran: boolean;
  accounts: AutoRunAccountResult[];
}> {
  const svc = getServiceClient();
  if (!svc) return { ran: false, accounts: [] };

  const { client } = resolveAlpacaClient();
  if (!client) return { ran: false, accounts: [] };

  const { data: configs } = await svc.from("broker_config").select("*").neq("mode", "sim");
  const out: AutoRunAccountResult[] = [];
  for (const cfg of configs || []) {
    out.push(await autoRunAccount(cfg, client));
  }
  return { ran: true, accounts: out };
}

async function autoRunAccount(
  cfg: Record<string, unknown>,
  client: AlpacaClient
): Promise<AutoRunAccountResult> {
  const svc = getServiceClient()!;
  const userId = String(cfg.user_id);
  const mode = String(cfg.mode);
  const result: AutoRunAccountResult = { user_id: userId, mode };

  // (a) Reconcile FIRST. Deciding on a stale mirror is how a bot sells a
  //     position it no longer has, or re-buys one it already holds.
  try {
    if (mode === client.mode) {
      result.reconciled = (await reconcile(userId, mode, client)) as unknown as Record<string, unknown>;
    }
  } catch (e) {
    result.skipped = `reconcile failed (${e instanceof Error ? e.message : String(e)}); refusing to trade on unreconciled state`;
    await audit(userId, "auto_run_skipped", { reason: result.skipped });
    return result;
  }

  // (b) Every reason not to act, cheapest and most serious first.
  if (cfg.kill_switch_active === true) {
    result.skipped = "kill switch is active";
    await audit(userId, "auto_run_skipped", { reason: result.skipped });
    return result;
  }
  if (cfg.autonomous_enabled !== true) {
    result.skipped = "autonomous_enabled is false";
    return result;
  }
  if (mode === "live") {
    // Autonomy and real money are two separate switches. Live is forced to
    // recommend-only no matter what autonomous_enabled says.
    result.skipped = "live mode is forced to recommend-only; autonomy never places live orders";
    await audit(userId, "auto_run_skipped", { reason: result.skipped });
    return result;
  }
  if (mode !== "paper") {
    result.skipped = `mode "${mode}" is not paper`;
    return result;
  }
  if (mode !== client.mode) {
    result.skipped = `account mode "${mode}" does not match server broker connection "${client.mode}"`;
    return result;
  }

  let clock: Record<string, unknown>;
  try {
    clock = await client.getClock();
  } catch (e) {
    result.skipped = `could not read broker clock (${e instanceof Error ? e.message : String(e)})`;
    return result;
  }
  if (clock.is_open !== true) {
    result.skipped = `market is closed (next open ${String(clock.next_open)})`;
    return result;
  }

  // (c) Allowlisted symbols only. An empty allowlist means nothing to do.
  const { data: allowed } = await svc
    .from("allowed_symbols")
    .select("symbol")
    .eq("user_id", userId);
  const symbols = (allowed || []).map((r) => String(r.symbol));
  if (symbols.length === 0) {
    result.skipped = "symbol allowlist is empty";
    return result;
  }

  // Fresh broker state for sizing and for what we may sell.
  const [account, positions] = await Promise.all([client.getAccount(), client.getPositions()]);
  const equity = Number(account.equity);
  const held = new Map<string, number>();
  for (const p of positions) held.set(String(p.symbol), Number(p.qty));

  result.rule = SIGNAL_RULE_TEXT;
  result.evaluated = [];
  result.actions = [];

  for (const symbol of symbols) {
    let outcome;
    try {
      const bars = await getDailyBars(symbol);
      outcome = computeSignal(bars.bars);
    } catch (e) {
      result.evaluated.push({ symbol, error: e instanceof Error ? e.message : String(e) });
      continue;
    }
    if (outcome.kind !== "signal") {
      result.evaluated.push({ symbol, kind: outcome.kind, reason: outcome.reason });
      continue;
    }
    result.evaluated.push({
      symbol,
      action: outcome.action,
      sma20: outcome.sma20,
      sma50: outcome.sma50,
      crossoverDate: outcome.crossoverDate,
      lastBarDate: outcome.lastBarDate,
    });
    if (outcome.action === "NONE" || !outcome.crossoverDate) continue;

    const side = outcome.action === "BUY" ? "buy" : "sell";
    // Deterministic: one order per crossover event per symbol per side.
    // A run that fires twice, or late, computes the same key.
    const dedupeKey = `${symbol}:${side}:${outcome.crossoverDate}`;

    let limitPrice: number;
    try {
      const quote = await getQuote(symbol);
      if (quote.freshness === "stale") {
        result.actions.push({ symbol, side, skipped: "quote is stale", dedupeKey });
        continue;
      }
      const band = cfg.limit_band_pct == null ? 0 : Number(cfg.limit_band_pct);
      limitPrice =
        Math.round(
          (side === "buy" ? quote.price * (1 + band / 100) : quote.price * (1 - band / 100)) * 100
        ) / 100;
    } catch (e) {
      result.actions.push({ symbol, side, skipped: `no quote (${e instanceof Error ? e.message : e})`, dedupeKey });
      continue;
    }

    // (f) Size from the configured limits, never a hardcoded number. The
    //     binding constraint is whichever ceiling is lowest.
    const caps = [
      Number(cfg.max_order_notional),
      Number(cfg.max_position_notional),
      (equity * Number(cfg.max_position_pct_equity)) / 100,
    ].filter((n) => Number.isFinite(n));
    const cap = Math.min(...caps);
    let qty = Math.floor(cap / limitPrice);

    if (side === "sell") {
      // (e) Sell only what the broker says we actually hold.
      const have = held.get(symbol) ?? 0;
      qty = Math.min(qty, Math.floor(have));
      if (qty <= 0) {
        result.actions.push({ symbol, side, skipped: `no position held (broker reports ${have})`, dedupeKey });
        continue;
      }
    }
    if (qty <= 0) {
      result.actions.push({ symbol, side, skipped: `position size from limits rounds to 0 (cap ${cap}, price ${limitPrice})`, dedupeKey });
      continue;
    }

    // (d) The ordinary path: full preflight, lock, limits. No bypass.
    const outcomeSubmit = await submitOrder({
      userId,
      symbol,
      side,
      qty,
      limitPrice,
      mode: "paper",
      dedupeKey,
      placedBy: "autonomous",
    });
    result.actions.push({
      symbol,
      side,
      qty,
      limitPrice,
      dedupeKey,
      httpStatus: outcomeSubmit.status,
      result: outcomeSubmit.body,
    });
    await audit(userId, "auto_run_order", {
      symbol,
      side,
      qty,
      dedupeKey,
      status: outcomeSubmit.status,
    });
  }

  return result;
}
