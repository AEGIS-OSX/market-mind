import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/api/serviceRole";
import { resolveAlpacaClient } from "@/lib/broker/alpaca";
import { reconcile, reconcileAllAccounts } from "@/lib/broker/reconcile";

export const dynamic = "force-dynamic";

/**
 * Constant-time comparison. A plain === on a secret leaks its prefix through
 * timing; cheap to avoid, so avoid it.
 */
function secretMatches(supplied: string | null, expected: string | undefined): boolean {
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// POST /api/broker/reconcile
//
// Two callers:
//  - the scheduled job, authenticated by the x-reconcile-secret header, which
//    reconciles every non-sim account (there is no session behind a cron);
//  - a logged-in user, who reconciles only their own account.
//
// Reads the broker and writes our mirror. Places nothing, cancels nothing.
export async function POST(request: NextRequest) {
  const supplied = request.headers.get("x-reconcile-secret");
  if (supplied) {
    if (!secretMatches(supplied, process.env.RECONCILE_SECRET)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await reconcileAllAccounts();
    return NextResponse.json({ reconciled: true, trigger: "scheduled", ...result });
  }

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
  return NextResponse.json({ reconciled: true, trigger: "session", ...result });
}
