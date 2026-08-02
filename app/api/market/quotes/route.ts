import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotes, normalizeSymbol } from "@/lib/api/marketData";

export const dynamic = "force-dynamic";

// GET /api/market/quotes?symbols=AAPL,MSFT — session required (quotes are not
// user data, but the endpoint proxies a metered upstream; auth keeps it from
// being an open relay).
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = request.nextUrl.searchParams.get("symbols") || "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => normalizeSymbol(s))
        .filter((s): s is string => s !== null)
    )
  ).slice(0, 20);
  if (!symbols.length) {
    return NextResponse.json({ error: "symbols query param required" }, { status: 400 });
  }

  const quotes = await getQuotes(symbols);
  return NextResponse.json({ quotes });
}
