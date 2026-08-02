import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client: bypasses RLS. Used ONLY server-side for
// (a) the shared market-data caches, which users must never write, and
// (b) trading-engine mutations (accounts / positions / trades), so a user
//     cannot forge fills or balances through PostgREST.
//
// Returns null when the key is not configured (e.g. a preview environment
// before env setup) -- callers degrade: caches are skipped, trading routes
// return 503 rather than falling back to a weaker write path.

let cached: SupabaseClient | null | undefined;

export function getServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
