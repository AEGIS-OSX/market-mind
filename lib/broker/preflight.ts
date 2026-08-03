import "server-only";
import { getServiceClient } from "@/lib/api/serviceRole";

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

  return { allowed: true, code: "ok", mode: config.mode, checks };
}
