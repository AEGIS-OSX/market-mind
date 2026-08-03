import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REQUIRED_LIMITS } from "@/lib/broker/preflight";

export const dynamic = "force-dynamic";

// GET /api/broker/status — the caller's own broker safety configuration.
// Read through the SESSION client, so RLS scopes it to auth.uid(); a caller
// cannot read another account's limits or kill-switch state.
//
// An account with no broker_config row reports the inert defaults rather than
// 404ing: mode "sim", live disabled, and every limit NULL — which preflight
// treats as a refusal.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: config, error } = await supabase
    .from("broker_config")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count, error: countError } = await supabase
    .from("allowed_symbols")
    .select("symbol", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const limits = Object.fromEntries(
    REQUIRED_LIMITS.map((k) => [k, config ? (config[k] ?? null) : null])
  );
  const unsetLimits = REQUIRED_LIMITS.filter((k) => limits[k] === null);

  return NextResponse.json({
    configured: Boolean(config),
    mode: config?.mode ?? "sim",
    live_enabled: config?.live_enabled ?? false,
    kill_switch_active: config?.kill_switch_active ?? false,
    limits,
    unsetLimits,
    limitsConfigured: unsetLimits.length === 0,
    allowlistCount: count ?? 0,
    updated_at: config?.updated_at ?? null,
    note: "No broker is connected. A NULL limit is treated as a refusal, never as unlimited.",
  });
}
