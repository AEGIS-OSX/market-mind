import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decideTrade } from "@/lib/trade-engine";

// Execute (or recommend) a trade for the signed-in user. This is the
// live-money execution path, so it is session-bound end to end: 401 without a
// session, settings come from the user's own user_settings row, and executed
// trades land in the trades table under RLS. The previous implementation
// wrote JSON to <cwd>/data/ (read-only on Vercel serverless) and did no auth.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { symbol?: unknown; side?: unknown; qty?: unknown; price?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { symbol, side, qty, price } = body;
  if (
    !symbol || typeof symbol !== "string" ||
    (side !== "buy" && side !== "sell") ||
    typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields: symbol, side (buy|sell), qty (positive number) required" },
      { status: 400 }
    );
  }
  if (price !== undefined && (typeof price !== "number" || !Number.isFinite(price) || price <= 0)) {
    return NextResponse.json(
      { error: "price, when provided, must be a positive number" },
      { status: 400 }
    );
  }

  // The user's real settings row. No row yet -> the safe default: recommend
  // only, no cap.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("execution_mode, investment_cap")
    .eq("user_id", user.id)
    .maybeSingle();

  const executionMode: "auto" | "recommend" =
    settings?.execution_mode === "auto" ? "auto" : "recommend";
  const investmentCap =
    typeof settings?.investment_cap === "number" ? settings.investment_cap : null;

  // Cap enforcement needs a notional value, so it applies when a price is
  // known. (No market-data feed exists to price the order server-side.)
  if (investmentCap !== null && typeof price === "number" && qty * price > investmentCap) {
    return NextResponse.json(
      { error: `Order notional ${(qty * price).toFixed(2)} exceeds investment cap ${investmentCap}` },
      { status: 400 }
    );
  }

  const decision = decideTrade(executionMode, { symbol, side, qty, price });

  if (decision.action === "recommend_only") {
    return NextResponse.json({ placed: false, message: decision.message });
  }

  const { data: trade, error } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      symbol,
      side,
      quantity: qty,
      price: price ?? 0,
      executed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // placed:false is deliberate -- nothing was placed with a brokerage. The
  // trade row is the app's own record of the simulated execution.
  return NextResponse.json({
    placed: false,
    recorded: true,
    tradeId: trade.id,
    message: decision.message,
  });
}
