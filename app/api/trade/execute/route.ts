import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTrade } from "@/lib/api/trading";

export const dynamic = "force-dynamic";

// POST /api/trade/execute — the single trade contract:
//   { symbol: string, side: "buy" | "sell", quantity: number, approved?: boolean }
// (The old split where this route took `qty` and /api/trade took `quantity`
// is reconciled here on `quantity`; /api/trade is a thin alias.)
// user_id comes exclusively from the server-side session.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { symbol?: unknown; side?: unknown; quantity?: unknown; approved?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { symbol, side, quantity } = body;
  if (
    !symbol || typeof symbol !== "string" ||
    (side !== "buy" && side !== "sell") ||
    typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields: symbol, side (buy|sell), quantity (positive number) required" },
      { status: 400 }
    );
  }

  const outcome = await executeTrade({
    userId: user.id,
    symbol,
    side,
    quantity,
    approved: body.approved === true,
  });
  return NextResponse.json(outcome.body, { status: outcome.status });
}
