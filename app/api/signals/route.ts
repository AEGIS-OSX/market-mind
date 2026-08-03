import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDailyBars } from "@/lib/api/marketData";
import { computeSignal, SIGNAL_RULE_TEXT } from "@/lib/signals-rule";

export const dynamic = "force-dynamic";

// The scan universe. Tickers are identifiers, not data — every NUMBER shown
// for them is computed from bars fetched at request time (or an honest
// insufficient/error state).
const WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO"];

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const signals = await Promise.all(
    WATCHLIST.map(async (symbol) => {
      try {
        const series = await getDailyBars(symbol);
        const outcome = computeSignal(series.bars);
        return {
          symbol,
          outcome,
          source: series.source,
          fetchedAt: series.fetchedAt,
          stale: series.stale,
          settledThrough: series.settledThrough,
          droppedUnsettled: series.droppedUnsettled,
        };
      } catch (e) {
        return {
          symbol,
          outcome: null,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    })
  );

  return NextResponse.json({ rule: SIGNAL_RULE_TEXT, watchlist: WATCHLIST, signals });
}
