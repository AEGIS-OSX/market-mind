import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/trades — the signed-in user's trade history, via the session
// client so RLS scopes rows to auth.uid().
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("trades")
    .select("id, symbol, side, quantity, price, executed_at, price_source, price_as_of, realized_pnl")
    .eq("user_id", user.id)
    .order("executed_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trades: data || [] });
}
