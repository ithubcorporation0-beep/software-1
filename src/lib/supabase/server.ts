import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { recordQuery } from "@/lib/perf/timing";

function wrapWithTimingProxy<T extends object>(builder: T, queryName: string): T {
  return new Proxy(builder, {
    get(target: any, prop: string | symbol, receiver: any) {
      const origValue = Reflect.get(target, prop, receiver);

      if (prop === "then" && typeof origValue === "function") {
        return function (onFulfilled?: any, onRejected?: any) {
          const start = performance.now();
          return origValue.call(
            target,
            (res: any) => {
              const dur = performance.now() - start;
              recordQuery(queryName, dur);
              if (dur >= 100) {
                console.warn(
                  `[DATABASE SLOW QUERY ALERT] ${queryName} executed in ${dur.toFixed(2)}ms (Threshold: 100ms)`
                );
              }
              return onFulfilled ? onFulfilled(res) : res;
            },
            (err: any) => {
              const dur = performance.now() - start;
              recordQuery(`${queryName}:err`, dur);
              if (dur >= 100) {
                console.warn(
                  `[DATABASE SLOW QUERY ALERT] ${queryName}:err executed in ${dur.toFixed(2)}ms (Threshold: 100ms)`
                );
              }
              return onRejected ? onRejected(err) : Promise.reject(err);
            }
          );
        };
      }

      if (typeof origValue === "function") {
        return function (...args: any[]) {
          const result = origValue.apply(target, args);
          if (result && typeof result === "object") {
            return wrapWithTimingProxy(result, queryName);
          }
          return result;
        };
      }

      return origValue;
    },
  });
}

/**
 * Creates a server-side Supabase client using App Router cookie store
 * with integrated performance timing instrumentation.
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

  const rawClient = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  return new Proxy(rawClient, {
    get(target: any, prop: string | symbol, receiver: any) {
      if (prop === "from") {
        return function (table: string) {
          const builder = target.from(table);
          return wrapWithTimingProxy(builder, `from:${table}`);
        };
      }
      if (prop === "rpc") {
        return function (fn: string, args?: any) {
          const builder = target.rpc(fn, args);
          return wrapWithTimingProxy(builder, `rpc:${fn}`);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
