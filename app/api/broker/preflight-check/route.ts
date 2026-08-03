import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/api/serviceRole";
import { getQuote, normalizeSymbol } from "@/lib/api/marketData";
import { preflight, isBrokerMode } from "@/lib/broker/preflight";

export const dynamic = "force-dynamic";

// POST /api/broker/preflight-check
//   { symbol, side, qty, mode, limitPrice? }
//
// Runs the safety gate and returns its verdict. It PLACES NOTHING.
//
// When no limitPrice is given it derives the same one /api/broker/order
// would: a fresh quote widened by the account's limit_band_pct. Without that
// parity a dry run could pass while the real order fails a notional limit.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    symbol?: unknown;
    side?: unknown;
    qty?: unknown;
    mode?: unknown;
    limitPrice?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { symbol, side, qty, mode } = body;
  if (
    !symbol || typeof symbol !== "string" ||
    (side !== "buy" && side !== "sell") ||
    typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0 ||
    !isBrokerMode(mode)
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields: symbol (string), side (buy|sell), qty (positive number), mode (sim|paper|live) required",
      },
      { status: 400 }
    );
  }

  const normalized = normalizeSymbol(symbol) ?? symbol.trim().toUpperCase();

  let limitPrice: number | undefined;
  let reference: Record<string, unknown> | null = null;
  if (typeof body.limitPrice === "number" && Number.isFinite(body.limitPrice)) {
    limitPrice = body.limitPrice;
    reference = { limitPrice, source: "supplied by caller" };
  } else {
    const svc = getServiceClient();
    const { data: config } = svc
      ? await svc
          .from("broker_config")
          .select("limit_band_pct")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
    try {
      const quote = await getQuote(normalized);
      const band = config?.limit_band_pct == null ? 0 : Number(config.limit_band_pct);
      limitPrice =
        Math.round(
          (side === "buy"
            ? quote.price * (1 + band / 100)
            : quote.price * (1 - band / 100)) * 100
        ) / 100;
      reference = {
        quotePrice: quote.price,
        quoteSource: quote.source,
        quoteAsOf: quote.asOf,
        limitBandPct: band,
        limitPrice,
      };
    } catch {
      // No price: preflight will refuse for no_reference_price, which is the
      // honest outcome rather than inventing one here.
      reference = { error: `no quote available for ${normalized}` };
    }
  }

  const verdict = await preflight({
    userId: user.id,
    symbol: normalized,
    side,
    qty,
    mode,
    limitPrice,
  });

  return NextResponse.json({
    placed: false,
    verdict,
    reference,
    note: "Preflight only. Nothing was submitted to any broker.",
  });
}
