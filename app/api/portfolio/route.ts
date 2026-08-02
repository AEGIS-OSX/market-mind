import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/api/marketData";
import { ensureAccount, SIMULATED_LABEL, STARTING_CASH } from "@/lib/api/trading";
import { getServiceClient } from "@/lib/api/serviceRole";

export const dynamic = "force-dynamic";

// GET /api/portfolio — simulated account + real-priced holdings.
// Holdings whose quote cannot be fetched are EXCLUDED from totals and listed
// with their error; totals then carry partial:true. Excluding is honest;
// pricing them from thin air is not.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Portfolio engine not configured (missing service credentials)." },
      { status: 503 }
    );
  }

  const account = await ensureAccount(user.id);
  if (!account) {
    return NextResponse.json({ error: "Could not load simulated account." }, { status: 503 });
  }

  const { data: positions } = await svc
    .from("positions")
    .select("symbol, quantity, avg_cost")
    .eq("user_id", user.id);
  const posList = positions || [];

  const { data: realizedRows } = await svc
    .from("trades")
    .select("realized_pnl")
    .eq("user_id", user.id)
    .not("realized_pnl", "is", null);
  const closedPnl = (realizedRows || []).reduce((s, r) => s + Number(r.realized_pnl), 0);

  const symbols = posList.map((p) => p.symbol);
  const quotes = symbols.length ? await getQuotes(symbols) : {};

  let marketValue = 0;
  let openPnl = 0;
  let partial = false;

  const holdings = posList.map((p) => {
    const qty = Number(p.quantity);
    const avg = Number(p.avg_cost);
    const q = quotes[p.symbol];
    if (q && q.ok) {
      const value = qty * q.quote.price;
      const pnl = value - qty * avg;
      marketValue += value;
      openPnl += pnl;
      return {
        symbol: p.symbol,
        quantity: qty,
        avgCost: avg,
        price: q.quote.price,
        priceSource: q.quote.source,
        priceAsOf: q.quote.asOf,
        freshness: q.quote.freshness,
        marketValue: value,
        openPnl: pnl,
      };
    }
    partial = true;
    return {
      symbol: p.symbol,
      quantity: qty,
      avgCost: avg,
      price: null,
      priceError: q && !q.ok ? q.error : "quote unavailable",
      excludedFromTotals: true,
    };
  });

  const portfolioValue = account.cash + marketValue;
  const totalReturnPct =
    account.starting_cash > 0
      ? ((portfolioValue - account.starting_cash) / account.starting_cash) * 100
      : 0;

  return NextResponse.json({
    label: SIMULATED_LABEL,
    account: {
      cash: account.cash,
      startingCash: account.starting_cash,
      defaultStartingCash: STARTING_CASH,
    },
    holdings,
    totals: { marketValue, portfolioValue, openPnl, closedPnl, totalReturnPct, partial },
  });
}
