import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a server-side Supabase client using App Router cookie store.
 */
export async function createClient() {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Request scope not active (e.g. unit tests or background scripts)
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-public-jwt-token";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        if (!cookieStore) return;
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component can be ignored if middleware handles refresh
        }
      },
    },
  });
}
