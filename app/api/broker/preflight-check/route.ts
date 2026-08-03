import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { preflight, isBrokerMode } from "@/lib/broker/preflight";

export const dynamic = "force-dynamic";

// POST /api/broker/preflight-check
//   { symbol: string, side: "buy" | "sell", qty: number, mode: "sim"|"paper"|"live" }
//
// Runs the safety gate and returns its verdict. It PLACES NOTHING. There is
// no broker client in this codebase, this route imports none, and an
// allowed:true verdict here means only "this order would be permitted to
// proceed" -- never that anything was submitted anywhere.
//
// user_id comes exclusively from the server-side session; a caller cannot run
// preflight against someone else's configuration.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { symbol?: unknown; side?: unknown; qty?: unknown; mode?: unknown };
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

  const verdict = await preflight({
    userId: user.id,
    symbol: symbol.trim().toUpperCase(),
    side,
    qty,
    mode,
  });

  return NextResponse.json({
    placed: false,
    verdict,
    note: "Preflight only. No broker is connected and nothing was submitted.",
  });
}
