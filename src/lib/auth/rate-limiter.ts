/**
 * In-Memory Sliding Window Rate Limiter for Abuse & Brute-Force Prevention.
 * Protects authentication, registration, password reset, search, and export endpoints.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
}

/**
 * Checks whether the current request is within the allowable rate limit.
 * Supports both object options `{ maxRequests, windowMs }` and positional arguments `(identifier, maxRequests, windowMs)`.
 */
export function checkRateLimit(
  identifier: string,
  optionsOrMax: RateLimitOptions | number,
  maybeWindowMs?: number
): RateLimitResult & { retryAfterSeconds?: number } {
  const options: RateLimitOptions =
    typeof optionsOrMax === "number"
      ? { maxRequests: optionsOrMax, windowMs: maybeWindowMs || 60000 }
      : optionsOrMax;

  const now = Date.now();
  cleanupStaleEntries(options.windowMs);

  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < options.windowMs);

  if (record.timestamps.length >= options.maxRequests) {
    const oldest = record.timestamps[0] || now;
    const resetTimeMs = oldest + options.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: options.maxRequests - record.timestamps.length,
    resetTimeMs: now + options.windowMs,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets the rate limit for a specific key (e.g. after successful login).
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clears the entire rate limit store (used in test setup).
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

export const resetRateLimiter = clearRateLimitStore;
