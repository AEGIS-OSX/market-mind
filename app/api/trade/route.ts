import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTrade } from "@/lib/api/trading";

export const dynamic = "force-dynamic";

// POST /api/trade — alias for /api/trade/execute, same contract
// ({ symbol, side, quantity, approved? }). Kept so older callers keep
// working; the price:0 direct-insert this route used to do is gone — every
// fill now goes through the engine and records a real price with provenance.
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
