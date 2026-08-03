import "server-only";
import { randomUUID } from "crypto";
import { getServiceClient } from "@/lib/api/serviceRole";

// Per-user order mutex.
//
// WHY A LEASE ROW rather than a Postgres advisory lock: every database call
// here goes through PostgREST, which runs each statement in its own
// transaction over a pooled connection. pg_advisory_xact_lock would be
// released at the end of the first statement, and a session-level advisory
// lock would stay attached to a pooled connection and leak onto whichever
// request picks it up next. A lease row is held across as many round-trips
// as the operation needs and expires on its own if the process dies.
//
// The claim is one conditional UPDATE, which Postgres makes atomic: two
// concurrent updaters contend on the row, the loser re-evaluates its WHERE
// against the committed new version, and matches zero rows.
//
// THE LOCK IS HELD ACROSS THE BROKER HTTP CALL. That is deliberate and it is
// the whole point: preflight reads the broker's live order count and then
// submits, and if a second request can read that count before the first
// submit lands, both pass a limit that should have admitted one. Bounding the
// hold to "check only" would leave exactly the race this exists to close.
// The exposure is bounded three ways: the Alpaca client times out at 15s, the
// lease expires at 30s no matter what, and the lock is per user, so one
// account's slow broker call never blocks another's.

const LEASE_MS = 30_000;
const DEFAULT_WAIT_MS = 25_000;
const POLL_MS = 300;

export interface LockHandle {
  token: string;
  release: () => Promise<void>;
}

async function tryAcquire(userId: string): Promise<LockHandle | null> {
  const svc = getServiceClient();
  if (!svc) return null;
  const token = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();

  // The row must exist before it can be claimed. A duplicate here is normal
  // and simply means someone created it first.
  await svc.from("order_locks").insert({ user_id: userId }).then(
    () => undefined,
    () => undefined
  );

  const { data, error } = await svc
    .from("order_locks")
    .update({
      token,
      acquired_at: nowIso,
      expires_at: new Date(now.getTime() + LEASE_MS).toISOString(),
    })
    .eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.lt.${nowIso}`)
    .select("user_id");

  if (error || !data || data.length === 0) return null;

  return {
    token,
    release: async () => {
      // Only release a lease we still hold: if ours expired and someone else
      // claimed it, clearing it would hand them a lock they think is theirs.
      await svc
        .from("order_locks")
        .update({ token: null, acquired_at: null, expires_at: null })
        .eq("user_id", userId)
        .eq("token", token);
    },
  };
}

/**
 * Wait for the lock, then run fn, then release it no matter what.
 * Callers that time out are told so explicitly rather than proceeding
 * unserialized -- an order that cannot be serialized is not sent.
 */
export async function withUserOrderLock<T>(
  userId: string,
  fn: () => Promise<T>,
  waitMs: number = DEFAULT_WAIT_MS
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  const deadline = Date.now() + waitMs;
  let handle: LockHandle | null = null;

  for (;;) {
    handle = await tryAcquire(userId);
    if (handle) break;
    if (Date.now() >= deadline) {
      return {
        ok: false,
        reason: `Another order for this account is already in flight and did not finish within ${Math.round(
          waitMs / 1000
        )}s. Refusing to send this one unserialized.`,
      };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  try {
    return { ok: true, value: await fn() };
  } finally {
    await handle.release().catch(() => undefined);
  }
}
