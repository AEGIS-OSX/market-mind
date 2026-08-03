import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAlpacaClient } from "@/lib/broker/alpaca";

export const dynamic = "force-dynamic";

// GET /api/broker/state — everything the broker page renders.
//
// Orders and positions are read through the SESSION client so RLS scopes them
// to the caller. The account line is fetched live from the broker, because an
// account balance is exactly the kind of number that must not be served from
// a mirror that might be minutes stale.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: config }, { data: orders }, { data: positions }, { data: intents }] =
    await Promise.all([
      supabase.from("broker_config").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("broker_orders")
        .select("broker_order_id, client_order_id, symbol, side, qty, filled_qty, avg_fill_price, status, submitted_at, filled_at, mode")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(50),
      supabase
        .from("broker_positions")
        .select("symbol, qty, avg_entry_price, market_value, unrealized_pnl, mode, synced_at")
        .eq("user_id", user.id),
      supabase
        .from("order_intents")
        .select("client_order_id, symbol, side, qty, limit_price, state, broker_order_id, last_error, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  let account: Record<string, unknown> | null = null;
  let accountError: string | null = null;
  const { client } = resolveAlpacaClient();
  if (client && config?.mode && config.mode !== "sim") {
    try {
      const a = await client.getAccount();
      account = {
        account_number: a.account_number,
        status: a.status,
        equity: a.equity,
        last_equity: a.last_equity,
        cash: a.cash,
        buying_power: a.buying_power,
        trade_suspended_by_user: a.trade_suspended_by_user,
        trading_blocked: a.trading_blocked,
      };
    } catch (e) {
      accountError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    mode: config?.mode ?? "sim",
    killSwitchActive: config?.kill_switch_active ?? false,
    liveEnabled: config?.live_enabled ?? false,
    limits: {
      max_order_notional: config?.max_order_notional ?? null,
      max_position_notional: config?.max_position_notional ?? null,
      max_position_pct_equity: config?.max_position_pct_equity ?? null,
      max_daily_loss: config?.max_daily_loss ?? null,
      max_orders_per_day: config?.max_orders_per_day ?? null,
      max_orders_per_minute: config?.max_orders_per_minute ?? null,
      limit_band_pct: config?.limit_band_pct ?? null,
    },
    account,
    accountError,
    orders: orders || [],
    positions: positions || [],
    intents: intents || [],
  });
}
