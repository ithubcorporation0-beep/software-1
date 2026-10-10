import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-safe Supabase client.
 * Uses strictly the public anonymous key; never includes service-role keys.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-public-jwt-token";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
