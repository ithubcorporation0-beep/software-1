import { createBrowserClient } from "@supabase/ssr";

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates a browser-safe Supabase client.
 * Uses strictly the public anonymous key; never includes service-role keys.
 * Reuses a single shared client instance in the browser.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-public-jwt-token";

  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClientInstance;
}
