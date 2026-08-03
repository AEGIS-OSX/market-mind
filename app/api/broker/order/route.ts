import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/api/serviceRole";
import { getQuote, normalizeSymbol } from "@/lib/api/marketData";
import { submitOrder, syncBrokerPositions } from "@/lib/broker/submit-order";
import { resolveAlpacaClient } from "@/lib/broker/alpaca";

export const dynamic = "force-dynamic";

// POST /api/broker/order  { symbol, side, qty }
//
// Places a REAL order with the broker the server is configured for. The
// request body carries no mode: the account's configured mode comes from
// broker_config and the reachable venue comes from the server environment,
// and submitOrder refuses unless those two agree.
//
// Orders are limit orders priced within the account's limit_band_pct of a
// fresh quote. A market order would accept any fill price the book offers; a
// band-limited limit order cannot fill worse than a number we chose on
// purpose. time_in_force is 'day' so nothing survives the session unnoticed.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Broker layer not configured (missing service credentials)." },
      { status: 503 }
    );
  }

  let body: { symbol?: unknown; side?: unknown; qty?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? normalizeSymbol(body.symbol) : null;
  const { side, qty } = body;
  if (
    !symbol ||
    (side !== "buy" && side !== "sell") ||
    typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields: symbol (string), side (buy|sell), qty (positive number) required" },
      { status: 400 }
    );
  }

  // Mode is the account's configured mode -- never anything the caller sent.
  const { data: config } = await svc
    .from("broker_config")
    .select("mode, limit_band_pct")
    .eq("user_id", user.id)
    .maybeSingle();
  const mode = (config?.mode ?? "sim") as "sim" | "paper" | "live";
  if (mode === "sim") {
    return NextResponse.json(
      { error: "This account is in sim mode. Simulated trading is /api/trade/execute; this endpoint places real broker orders." },
      { status: 409 }
    );
  }

  // A real reference price or no order. A stale cached price is refused: we
  // will not derive a limit from a number we cannot vouch for right now.
  let quote;
  try {
    quote = await getQuote(symbol);
  } catch (e) {
    return NextResponse.json(
      { error: `No market data for ${symbol}; refusing to price a limit order. Nothing was sent. (${e instanceof Error ? e.message : e})` },
      { status: 422 }
    );
  }
  if (quote.freshness === "stale") {
    return NextResponse.json(
      { error: `Market data for ${symbol} is stale (as of ${quote.asOf}). Refusing to price a limit order from it. Nothing was sent.` },
      { status: 409 }
    );
  }

  // Band is applied in the direction that protects us: a buy may not pay more
  // than band above the quote, a sell may not accept less than band below it.
  const band = config?.limit_band_pct == null ? 0 : Number(config.limit_band_pct);
  const limitPrice =
    Math.round(
      (side === "buy" ? quote.price * (1 + band / 100) : quote.price * (1 - band / 100)) * 100
    ) / 100;

  const outcome = await submitOrder({
    userId: user.id,
    symbol,
    side,
    qty,
    limitPrice,
    mode,
  });

  // Refresh our position mirror from the broker after any accepted order, so
  // broker_positions reflects the broker rather than our expectations.
  if (outcome.status === 201 || outcome.status === 200) {
    try {
      const { client } = resolveAlpacaClient();
      if (client) await syncBrokerPositions(user.id, mode, client);
    } catch {
      /* mirror refresh is best-effort; the order result stands */
    }
  }

  return NextResponse.json(
    {
      ...outcome.body,
      reference: {
        quotePrice: quote.price,
        quoteSource: quote.source,
        quoteAsOf: quote.asOf,
        limitBandPct: band,
        limitPrice,
        timeInForce: "day",
        type: "limit",
      },
    },
    { status: outcome.status }
  );
}
