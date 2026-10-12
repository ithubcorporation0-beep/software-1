import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-public-jwt-token";

  // Check if live Supabase is configured
  const isSupabaseConfigured =
    supabaseUrl &&
    !supabaseUrl.includes("placeholder") &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes("placeholder");

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isPublicRoute =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".");

  if (isPublicRoute) {
    return response;
  }

  // If live Supabase is configured, enforce strict cookie session verification
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected Route: unauthenticated user -> redirect to /login
    if (!user && !isAuthRoute) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      // Preserve any updated or refreshed cookies
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value);
      });
      return redirectResponse;
    }

    // Auth Route: already authenticated user -> redirect to /
    if (user && isAuthRoute) {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value);
      });
      return redirectResponse;
    }
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
