import "server-only";
import { getServiceClient } from "@/lib/api/serviceRole";
import { resolveAlpacaClient } from "@/lib/broker/alpaca";

// Broker preflight. This is the gate every order must pass BEFORE anything is
// sent to a broker. There is no broker client in this codebase yet and this
// module never calls one -- it only decides, and records why.
//
// It is written to fail CLOSED. Every path that cannot positively establish
// that an order is safe returns { allowed: false }, including missing config,
// an unreadable database, and an unexpected error. There is no branch that
// returns allowed:true by default.
//
// The single most dangerous mistake this layer could make is reading a NULL
// limit as "no limit". A NULL means the limit was never configured, and an
// unconfigured limit REFUSES. See REQUIRED_LIMITS.

export const BROKER_MODES = ["sim", "paper", "live"] as const;
export type BrokerMode = (typeof BROKER_MODES)[number];

export function isBrokerMode(v: unknown): v is BrokerMode {
  return typeof v === "string" && (BROKER_MODES as readonly string[]).includes(v);
}

/**
 * Every limit that must be non-NULL before ANY order passes preflight.
 * Listed explicitly rather than derived, so adding a column to broker_config
 * cannot silently widen what is allowed through.
 */
export const REQUIRED_LIMITS = [
  "max_order_notional",
  "max_position_notional",
  "max_position_pct_equity",
  "max_daily_loss",
  "max_orders_per_day",
  "max_orders_per_minute",
  "limit_band_pct",
] as const;

/** Env vars that must both be present and non-empty before live is possible. */
export const LIVE_KEY_ENV_VARS = ["ALPACA_API_KEY", "ALPACA_API_SECRET"] as const;

export interface BrokerConfigRow {
  user_id: string;
  mode: BrokerMode;
  live_enabled: boolean;
  kill_switch_active: boolean;
  max_order_notional: number | null;
  max_position_notional: number | null;
  max_position_pct_equity: number | null;
  max_daily_loss: number | null;
  max_orders_per_day: number | null;
  max_orders_per_minute: number | null;
  limit_band_pct: number | null;
}

export interface PreflightInput {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  mode: BrokerMode;
  /**
   * The price the order would actually be worked at. Required in paper/live:
   * every notional limit is measured against it, and a limit measured against
   * nothing is not a limit.
   */
  limitPrice?: number;
}

export type PreflightVerdict =
  | { allowed: true; code: "ok"; mode: BrokerMode; checks: string[] }
  | { allowed: false; code: PreflightRefusalCode; reason: string };

export type PreflightRefusalCode =
  | "service_unavailable"
  | "config_unreadable"
  | "no_config"
  | "kill_switch_active"
  | "mode_mismatch"
  | "live_not_enabled"
  | "live_env_not_live"
  | "live_keys_missing"
  | "symbol_not_allowed"
  | "allowlist_unreadable"
  | "limits_not_configured"
  | "no_reference_price"
  | "broker_state_unavailable"
  | "max_order_notional"
  | "max_position_notional"
  | "max_position_pct_equity"
  | "max_daily_loss"
  | "max_orders_per_day"
  | "max_orders_per_minute"
  | "invalid_input"
  | "internal_error";

/**
 * Append a refusal to broker_audit_log. Best-effort: an audit write failure
 * must never turn a refusal into an approval, so it is swallowed and the
 * refusal stands.
 */
async function auditRefusal(
  input: PreflightInput,
  code: PreflightRefusalCode,
  reason: string
): Promise<void> {
  const svc = getServiceClient();
  if (!svc) return;
  try {
    await svc.from("broker_audit_log").insert({
      user_id: input.userId,
      event: "preflight_refused",
      detail: {
        code,
        reason,
        requested_mode: input.mode,
        symbol: input.symbol,
        side: input.side,
        qty: input.qty,
      },
    });
  } catch {
    /* audit is best-effort; the refusal is already decided */
  }
}

async function refuse(
  input: PreflightInput,
  code: PreflightRefusalCode,
  reason: string
): Promise<PreflightVerdict> {
  await auditRefusal(input, code, reason);
  return { allowed: false, code, reason };
}

export async function preflight(input: PreflightInput): Promise<PreflightVerdict> {
  const checks: string[] = [];

  // Input sanity. Refused before anything is read.
  if (!isBrokerMode(input.mode)) {
    return refuse(input, "invalid_input", "Requested mode is not one of sim, paper, live.");
  }
  if (!input.symbol || typeof input.symbol !== "string") {
    return refuse(input, "invalid_input", "A symbol is required.");
  }
  if (input.side !== "buy" && input.side !== "sell") {
    return refuse(input, "invalid_input", "Side must be buy or sell.");
  }
  if (!Number.isFinite(input.qty) || input.qty <= 0) {
    return refuse(input, "invalid_input", "Quantity must be a positive number.");
  }

  const svc = getServiceClient();
  if (!svc) {
    // Cannot read config, so cannot establish safety. Refuse; cannot audit
    // either, since auditing needs the same client.
    return {
      allowed: false,
      code: "service_unavailable",
      reason:
        "Broker safety layer cannot reach its configuration store. Refusing — safety limits are unverifiable.",
    };
  }

  let config: BrokerConfigRow | null;
  try {
    const { data, error } = await svc
      .from("broker_config")
      .select("*")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (error) {
      return refuse(
        input,
        "config_unreadable",
        `Broker configuration could not be read (${error.message}). Refusing — safety limits are unverifiable.`
      );
    }
    config = (data as BrokerConfigRow) || null;
  } catch (e) {
    return refuse(
      input,
      "config_unreadable",
      `Broker configuration could not be read (${e instanceof Error ? e.message : String(e)}). Refusing — safety limits are unverifiable.`
    );
  }

  if (!config) {
    return refuse(
      input,
      "no_config",
      "No broker configuration exists for this account. Refusing — nothing has been configured to make this safe."
    );
  }

  // 1. Kill switch. Checked first: when it is on, nothing else matters.
  if (config.kill_switch_active) {
    return refuse(
      input,
      "kill_switch_active",
      "Kill switch is active. All broker activity is halted for this account."
    );
  }
  checks.push("kill_switch_inactive");

  // 2. Requested mode must match configured mode. Prevents a caller from
  //    asking for live while the account is configured for sim.
  if (input.mode !== config.mode) {
    return refuse(
      input,
      "mode_mismatch",
      `Requested mode "${input.mode}" does not match the configured mode "${config.mode}". Refusing.`
    );
  }
  checks.push("mode_matches");

  // 3. Live requires the flag, the environment, and both credentials. Each is
  //    reported separately so a refusal says which one is missing.
  if (input.mode === "live") {
    if (!config.live_enabled) {
      return refuse(
        input,
        "live_not_enabled",
        "Live trading is not enabled for this account (live_enabled is false). Refusing."
      );
    }
    if (process.env.ALPACA_MODE !== "live") {
      return refuse(
        input,
        "live_env_not_live",
        `Server is not running in live broker mode (ALPACA_MODE=${
          process.env.ALPACA_MODE ? `"${process.env.ALPACA_MODE}"` : "unset"
        }, expected "live"). Refusing.`
      );
    }
    const missingKeys = LIVE_KEY_ENV_VARS.filter((k) => !process.env[k] || process.env[k] === "");
    if (missingKeys.length > 0) {
      return refuse(
        input,
        "live_keys_missing",
        `Live broker credentials are absent or empty: ${missingKeys.join(", ")}. Refusing.`
      );
    }
    checks.push("live_enabled", "live_env_ok", "live_keys_present");
  }

  // 4. Symbol allowlist. Empty allowlist means nothing is tradable.
  try {
    const { data, error } = await svc
      .from("allowed_symbols")
      .select("symbol")
      .eq("user_id", input.userId)
      .eq("symbol", input.symbol)
      .maybeSingle();
    if (error) {
      return refuse(
        input,
        "allowlist_unreadable",
        `Symbol allowlist could not be read (${error.message}). Refusing.`
      );
    }
    if (!data) {
      return refuse(
        input,
        "symbol_not_allowed",
        `${input.symbol} is not on this account's symbol allowlist. Refusing.`
      );
    }
  } catch (e) {
    return refuse(
      input,
      "allowlist_unreadable",
      `Symbol allowlist could not be read (${e instanceof Error ? e.message : String(e)}). Refusing.`
    );
  }
  checks.push("symbol_allowed");

  // 5. Every limit must be configured. A NULL limit is an UNSET limit, and an
  //    unset limit refuses. It is never read as "unlimited".
  const cfg = config;
  const unset = REQUIRED_LIMITS.filter((c) => cfg[c] === null || cfg[c] === undefined);
  if (unset.length > 0) {
    return refuse(
      input,
      "limits_not_configured",
      `Risk limits are not configured: ${unset.join(", ")}. A limit that has not been set is treated as a refusal, not as unlimited. Refusing.`
    );
  }
  checks.push("limits_configured");

  // ------------------------------------------------------------------
  // Numeric enforcement. Up to here the limits only had to EXIST; from
  // here they are actually compared against the order and the account.
  //
  // Every input below is fetched fresh from the broker at check time. None
  // of it is cached and none of it is read from our own tables: our mirror
  // can be stale or missing an order the broker accepted, and a risk limit
  // computed from a stale picture is not a risk limit.
  // ------------------------------------------------------------------
  const limitPrice = input.limitPrice;
  if (limitPrice == null || !Number.isFinite(limitPrice) || limitPrice <= 0) {
    return refuse(
      input,
      "no_reference_price",
      "No reference price supplied, so order value cannot be measured against the limits. Refusing."
    );
  }

  const orderNotional = input.qty * limitPrice;
  if (orderNotional > Number(cfg.max_order_notional)) {
    return refuse(
      input,
      "max_order_notional",
      `Order value ${orderNotional.toFixed(2)} exceeds max_order_notional ${Number(cfg.max_order_notional).toFixed(2)}. Refusing.`
    );
  }
  checks.push("max_order_notional");

  // sim never reaches a broker, so there is no broker state to measure.
  if (input.mode === "sim") {
    return { allowed: true, code: "ok", mode: config.mode, checks };
  }

  const { client } = resolveAlpacaClient();
  if (!client) {
    return refuse(
      input,
      "broker_state_unavailable",
      "Cannot reach the broker to read current positions, equity and order counts. Limits are unverifiable, so the order is refused."
    );
  }

  let account: Record<string, unknown>;
  let positions: Record<string, unknown>[];
  let dayOrders: Record<string, unknown>[];
  let minuteOrders: Record<string, unknown>[];
  try {
    const now = new Date();
    [account, positions, dayOrders, minuteOrders] = await Promise.all([
      client.getAccount(),
      client.getPositions(),
      client.getOrders({ status: "all", after: startOfEtDayIso(now), limit: 500 }),
      client.getOrders({
        status: "all",
        after: new Date(now.getTime() - 60_000).toISOString(),
        limit: 500,
      }),
    ]);
  } catch (e) {
    return refuse(
      input,
      "broker_state_unavailable",
      `Could not read fresh broker state (${e instanceof Error ? e.message : String(e)}). Limits are unverifiable, so the order is refused.`
    );
  }

  const equity = Number(account.equity);
  const lastEquity = Number(account.last_equity);

  // Resulting position, from FRESH broker positions -- not from our mirror.
  const existing = positions.find((p) => String(p.symbol) === input.symbol);
  const existingQty = existing ? Number(existing.qty) : 0;
  const resultingQty =
    input.side === "buy" ? existingQty + input.qty : existingQty - input.qty;
  const resultingNotional = Math.abs(resultingQty) * limitPrice;

  if (resultingNotional > Number(cfg.max_position_notional)) {
    return refuse(
      input,
      "max_position_notional",
      `Resulting ${input.symbol} position ${Math.abs(resultingQty)} x ${limitPrice} = ${resultingNotional.toFixed(2)} exceeds max_position_notional ${Number(cfg.max_position_notional).toFixed(2)}. Refusing.`
    );
  }
  checks.push("max_position_notional");

  if (!Number.isFinite(equity) || equity <= 0) {
    return refuse(
      input,
      "broker_state_unavailable",
      "Broker reported no usable equity, so position-vs-equity cannot be measured. Refusing."
    );
  }
  const resultingPct = (resultingNotional / equity) * 100;
  if (resultingPct > Number(cfg.max_position_pct_equity)) {
    return refuse(
      input,
      "max_position_pct_equity",
      `Resulting ${input.symbol} position would be ${resultingPct.toFixed(2)}% of equity ${equity.toFixed(2)}, exceeding max_position_pct_equity ${Number(cfg.max_position_pct_equity)}%. Refusing.`
    );
  }
  checks.push("max_position_pct_equity");

  // Daily loss. A breach is not just this order's problem -- the account is
  // already down more than it is allowed to be, so trading stops entirely.
  const dayPnl = equity - lastEquity;
  if (Number.isFinite(lastEquity) && dayPnl <= -Number(cfg.max_daily_loss)) {
    await tripKillSwitch(input.userId, dayPnl, Number(cfg.max_daily_loss));
    return refuse(
      input,
      "max_daily_loss",
      `Daily loss ${dayPnl.toFixed(2)} has reached max_daily_loss ${Number(cfg.max_daily_loss).toFixed(2)} (equity ${equity.toFixed(2)} vs last_equity ${lastEquity.toFixed(2)}). Kill switch tripped automatically; all trading halted. Refusing.`
    );
  }
  checks.push("max_daily_loss");

  if (dayOrders.length >= Number(cfg.max_orders_per_day)) {
    return refuse(
      input,
      "max_orders_per_day",
      `Broker shows ${dayOrders.length} orders today, at or above max_orders_per_day ${Number(cfg.max_orders_per_day)}. Refusing.`
    );
  }
  checks.push("max_orders_per_day");

  if (minuteOrders.length >= Number(cfg.max_orders_per_minute)) {
    return refuse(
      input,
      "max_orders_per_minute",
      `Broker shows ${minuteOrders.length} orders in the last 60 seconds, at or above max_orders_per_minute ${Number(cfg.max_orders_per_minute)}. Refusing.`
    );
  }
  checks.push("max_orders_per_minute");

  return { allowed: true, code: "ok", mode: config.mode, checks };
}

/** Breaching the daily loss limit halts the account, not just the order. */
async function tripKillSwitch(userId: string, dayPnl: number, limit: number): Promise<void> {
  const svc = getServiceClient();
  if (!svc) return;
  try {
    await svc
      .from("broker_config")
      .update({ kill_switch_active: true })
      .eq("user_id", userId);
    await svc.from("broker_audit_log").insert({
      user_id: userId,
      event: "kill_switch_auto_tripped",
      detail: { reason: "max_daily_loss breached", day_pnl: dayPnl, max_daily_loss: limit },
    });
  } catch {
    /* the refusal stands regardless */
  }
}

/** Midnight of the current US/Eastern calendar day, as a UTC instant. */
export function startOfEtDayIso(now: Date): string {
  const d: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)) {
    d[p.type] = p.value;
  }
  const naive = new Date(`${d.year}-${d.month}-${d.day}T00:00:00Z`);
  for (const offsetH of [4, 5]) {
    const cand = new Date(naive.getTime() + offsetH * 3600_000);
    const c: Record<string, string> = {};
    for (const p of new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(cand)) {
      c[p.type] = p.value;
    }
    if ((c.hour === "00" || c.hour === "24") && `${c.year}-${c.month}-${c.day}` === `${d.year}-${d.month}-${d.day}`) {
      return cand.toISOString();
    }
  }
  return new Date(naive.getTime() + 4 * 3600_000).toISOString();
}
