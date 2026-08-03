import { NextRequest, NextResponse } from "next/server";
import { autoRunAllAccounts } from "@/lib/broker/auto-run";

export const dynamic = "force-dynamic";
// Reconcile + evaluate + submit across several symbols, each serialized behind
// the per-user lock. The default 10s is not enough.
export const maxDuration = 60;

/** Constant-time compare; a plain === leaks the secret's prefix by timing. */
function secretMatches(supplied: string | null, expected: string | undefined): boolean {
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// POST /api/broker/auto-run — the scheduler's entry point. Shared-secret auth
// only; there is no session path, because nothing a browser does should be
// able to start an autonomous trading pass.
export async function POST(request: NextRequest) {
  const supplied = request.headers.get("x-reconcile-secret");
  if (!secretMatches(supplied, process.env.RECONCILE_SECRET)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await autoRunAllAccounts();
  return NextResponse.json({
    ...result,
    note: "Autonomous pass. Every order took the ordinary preflight and lock path; nothing bypasses the limits.",
  });
}
