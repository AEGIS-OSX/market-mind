import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function withSecurityHeaders(response: NextResponse): NextResponse {
  // 1. HSTS (HTTP Strict Transport Security)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // 2. CSP (Content Security Policy)
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://*.alpaca.markets ws://localhost:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // 3. X-Frame-Options (clickjacking protection)
  response.headers.set("X-Frame-Options", "DENY");

  // 4. X-Content-Type-Options (MIME sniffing protection)
  response.headers.set("X-Content-Type-Options", "nosniff");

  // 5. Referrer-Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Backend not provisioned yet (no env vars): serve with security headers
  // only. The auth gate activates automatically once provisioning wires the
  // env -- an unguarded client here would 500 every route until then.
  if (!supabaseUrl || !supabaseAnonKey) {
    return withSecurityHeaders(NextResponse.next({ request }));
  }

  // Session refresh (@supabase/ssr middleware pattern): getUser() revalidates
  // the token and setAll rewrites refreshed cookies onto the response.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Carry any refreshed session cookies across the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return withSecurityHeaders(redirect);
  };

  // Unauthenticated users cannot reach the dashboard (restores the gate
  // removed by PR #7, now that /login exists).
  if (!user && path.startsWith("/dashboard")) {
    return redirectTo("/login");
  }

  // Authenticated users skip the auth pages.
  if (user && (path === "/login" || path === "/signup")) {
    return redirectTo("/dashboard");
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
