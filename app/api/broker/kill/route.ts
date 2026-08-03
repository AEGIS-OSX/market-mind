import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { engageKillSwitch, releaseKillSwitch } from "@/lib/broker/kill-switch";

export const dynamic = "force-dynamic";

// POST /api/broker/kill   { active: true|false, reason?: string }
//
// Engaging returns 200 only when the BROKER confirms trade_suspended_by_user.
// If the broker cannot be reached or does not confirm, this returns 502 with
// the per-step detail: a kill switch that reports success it cannot prove is
// worse than one that reports failure.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { active?: unknown; reason?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* an empty body means engage */
  }
  const active = body.active !== false;
  const reason = typeof body.reason === "string" ? body.reason : "manual";

  const result = active
    ? await engageKillSwitch(user.id, reason)
    : await releaseKillSwitch(user.id);

  return NextResponse.json(
    {
      requested: active ? "engage" : "release",
      ...result,
      note: active
        ? "Engaged only if confirmedByBroker is true."
        : "Released only if the broker confirmed trade_suspended_by_user=false.",
    },
    { status: result.confirmedByBroker ? 200 : 502 }
  );
}
