import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-out action: plain form POST target (works without client JS). Clears
// the session cookie via the server client, then sends the user to /login.
export async function POST(request: Request) {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
