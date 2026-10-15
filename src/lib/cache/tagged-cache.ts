import { unstable_cache, revalidateTag } from "next/cache";

/**
 * In-memory fallback cache for environments outside Next.js server runtime (e.g. Vitest).
 * Enforces strict multi-tenant boundary separation: keys always prefixed with companyId.
 */
interface CacheEntry<T> {
  data: T;
  tags: string[];
  expiresAt: number;
}

const memoryTagCache = new Map<string, CacheEntry<any>>();

/**
 * Builds a deterministic, tenant-isolated cache key and tag set.
 */
export function buildCompanyCacheTag(companyId: string, namespace: string): string {
  if (!companyId) {
    throw new Error("Company ID is strictly required for tenant cache tag creation");
  }
  return `company-${companyId}-${namespace}`;
}

/**
 * Retrieves data from the Next.js tagged cache, falling back to an in-memory tagged store.
 * The cache key and tags strictly include companyId so cross-company cache pollution is impossible.
 *
 * @param companyId Verified tenant ID
 * @param namespace Cache domain (e.g., 'settings', 'roles', 'chart-of-accounts', 'customers-picker', 'dashboard')
 * @param fetcher Async function retrieving fresh data
 * @param ttlSeconds Time-to-live in seconds (default: 300s / 5 minutes)
 */
export async function getCachedCompanyData<T>(
  companyId: string,
  namespace: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const tag = buildCompanyCacheTag(companyId, namespace);
  const cacheKey = `${companyId}:${namespace}`;

  // If running in unit test / mock environment where next/cache is inert:
  if (process.env.NODE_ENV === "test") {
    const existing = memoryTagCache.get(cacheKey);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.data as T;
    }
    const fresh = await fetcher();
    memoryTagCache.set(cacheKey, {
      data: fresh,
      tags: [tag, `company-${companyId}`],
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return fresh;
  }

  // Next.js Production / Staging Serverless Runtime with Tagged Revalidation
  const cachedFetcher = unstable_cache(
    fetcher,
    [cacheKey],
    {
      tags: [tag, `company-${companyId}`],
      revalidate: ttlSeconds,
    }
  );

  return await cachedFetcher();
}

/**
 * Invalidates cached data for a specific company and namespace.
 * Must be invoked by mutation service functions whenever underlying entities change.
 */
export function revalidateCompanyTag(companyId: string, namespace?: string): void {
  if (!companyId) return;

  const targetTag = namespace
    ? buildCompanyCacheTag(companyId, namespace)
    : `company-${companyId}`;

  // 1. Next.js cache revalidation
  try {
    (revalidateTag as any)(targetTag, "max");
  } catch {
    // In environments where revalidateTag is called outside request context
  }

  // 2. Clear matching in-memory fallback entries
  for (const [key, entry] of memoryTagCache.entries()) {
    if (entry.tags.includes(targetTag) || key.startsWith(`${companyId}:`)) {
      if (!namespace || key === `${companyId}:${namespace}`) {
        memoryTagCache.delete(key);
      }
    }
  }
}

/**
 * Clears the test in-memory fallback cache (used in test suite beforeEach).
 */
export function resetMemoryTagCache(): void {
  memoryTagCache.clear();
}
export const clearAllTestCaches = resetMemoryTagCache;
