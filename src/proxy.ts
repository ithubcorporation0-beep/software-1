import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/admin-session";

function isTokenExpired(exp?: number): boolean {
  if (!exp) return true;
  // Expired if current time + 10s buffer exceeds exp
  return Math.floor(Date.now() / 1000) >= exp - 10;
}

export async function proxy(request: NextRequest) {
  const startMs = performance.now();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isPublicApi =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/health";

  const isPublicRoute =
    pathname.startsWith("/_next") ||
    isPublicApi ||
    pathname === "/favicon.ico" ||
    (pathname.includes(".") && !pathname.startsWith("/api"));

  // Never redirect Next.js Server Action RPC payloads
  if (isPublicRoute || request.headers.has("next-action")) {
    return response;
  }

  // 1. Check for signed administrative session cookie (0ms local HMAC check)
  const adminCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminSession = verifyAdminSessionToken(adminCookie);

  if (adminSession) {
    // Authenticated admin: redirect away from auth routes to dashboard (GET/HEAD only)
    if (isAuthRoute && (request.method === "GET" || request.method === "HEAD")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const totalMs = Math.round((performance.now() - startMs) * 100) / 100;
    response.headers.set("Server-Timing", `proxy;dur=${totalMs};desc="Proxy Admin"`);
    return response;
  }

  // 2. Check for live Supabase session if configured
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-public-jwt-token";

  const isSupabaseConfigured =
    supabaseUrl &&
    !supabaseUrl.includes("placeholder") &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes("placeholder");

  if (isSupabaseConfigured) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    let isAuthenticated = false;

    // Fast-path 1: Local JWT token extraction and claims verification without remote network/database round trip
    try {
      if (typeof (supabase.auth as any).getClaims === "function") {
        const { data: claimsData } = await (supabase.auth as any).getClaims();
        if (claimsData?.claims && !isTokenExpired(claimsData.claims.exp)) {
          isAuthenticated = true;
        }
      }
    } catch {
      // Fall through to cookie-level JWT check
    }

    // Fast-path 2: Direct cookie inspection for unexpired Supabase JWT
    if (!isAuthenticated) {
      try {
        const allCookies = request.cookies.getAll();
        for (const cookie of allCookies) {
          if (cookie.name.includes("auth-token") || cookie.name.includes("access-token")) {
            const rawVal = cookie.value;
            let tokenStr: string | null = null;
            if (rawVal.split(".").length === 3) {
              tokenStr = rawVal;
            } else {
              try {
                const parsed = JSON.parse(rawVal);
                if (typeof parsed === "string" && parsed.split(".").length === 3) tokenStr = parsed;
                else if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].split(".").length === 3) tokenStr = parsed[0];
                else if (parsed && typeof parsed.access_token === "string") tokenStr = parsed.access_token;
              } catch {
                try {
                  const decoded = decodeURIComponent(rawVal);
                  const parsed = JSON.parse(decoded);
                  if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].split(".").length === 3) tokenStr = parsed[0];
                  else if (parsed && typeof parsed.access_token === "string") tokenStr = parsed.access_token;
                } catch {}
              }
            }

            if (tokenStr && tokenStr.split(".").length === 3) {
              const payloadJson = Buffer.from(tokenStr.split(".")[1], "base64url").toString("utf8");
              const payload = JSON.parse(payloadJson);
              if (payload?.exp && !isTokenExpired(payload.exp)) {
                isAuthenticated = true;
                break;
              }
            }
          }
        }
      } catch {
        // Fall through safely
      }
    }

    if (!isAuthenticated) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        isAuthenticated = Boolean(user);
      } catch {
        isAuthenticated = false;
      }
    }

    // Protected Route: unauthenticated user -> redirect to /login
    if (!isAuthenticated && !isAuthRoute) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value);
      });
      return redirectResponse;
    }

    // Auth Route: already authenticated user -> redirect to / (GET/HEAD only)
    if (isAuthenticated && isAuthRoute && (request.method === "GET" || request.method === "HEAD")) {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value);
      });
      return redirectResponse;
    }

    const totalMs = Math.round((performance.now() - startMs) * 100) / 100;
    response.headers.set("Server-Timing", `proxy;dur=${totalMs};desc="Proxy Auth"`);
    return response;
  }

  // 3. Fail Closed: If no active admin session and no live Supabase, redirect unauthenticated users to /login
  if (!isAuthRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// Support default export as well
export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
