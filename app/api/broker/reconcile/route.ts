import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/api/serviceRole";
import { resolveAlpacaClient } from "@/lib/broker/alpaca";
import { reconcile } from "@/lib/broker/reconcile";

export const dynamic = "force-dynamic";

// POST /api/broker/reconcile — re-read the broker and make broker_orders and
// broker_positions equal to what it reports. Session-scoped; reconciles only
// the caller's own intents. Placing nothing, cancelling nothing: it is a read
// of the broker followed by a write of our mirror.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json({ error: "Broker layer not configured." }, { status: 503 });
  }

  const { client, reason } = resolveAlpacaClient();
  if (!client) return NextResponse.json({ error: reason }, { status: 503 });

  const { data: config } = await svc
    .from("broker_config")
    .select("mode")
    .eq("user_id", user.id)
    .maybeSingle();
  const mode = config?.mode ?? "sim";
  if (mode !== client.mode) {
    return NextResponse.json(
      { error: `Account mode "${mode}" does not match the server's broker connection "${client.mode}".` },
      { status: 409 }
    );
  }

  const result = await reconcile(user.id, mode, client);
  return NextResponse.json({ reconciled: true, ...result });
}
