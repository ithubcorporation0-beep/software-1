import { AsyncLocalStorage } from "node:async_hooks";

export interface QueryMetric {
  name: string;
  duration: number;
}

export interface TimingContext {
  name: string;
  startMs: number;
  authMs: number;
  permissionsMs: number;
  tenantMs: number;
  dbMs: number;
  queries: QueryMetric[];
  renderMs: number;
  totalMs: number;
}

export interface TimingSummary {
  name: string;
  totalMs: number;
  authMs: number;
  permissionsMs: number;
  tenantMs: number;
  dbMs: number;
  queryCount: number;
  renderMs: number;
  queries: QueryMetric[];
  serverTimingHeader: string;
}

const timingStorage = new AsyncLocalStorage<TimingContext>();

export function isPerfDebugEnabled(): boolean {
  return (
    process.env.PERF_DEBUG === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export function getTimingContext(): TimingContext | undefined {
  return timingStorage.getStore();
}

/**
 * Executes a function within an isolated performance tracking context.
 * Collects auth, permissions, tenant, query, and render metrics.
 */
export async function withTiming<T>(
  name: string,
  fn: (ctx: TimingContext) => Promise<T>
): Promise<{ result: T; timing: TimingSummary }> {
  const startMs = performance.now();
  const ctx: TimingContext = {
    name,
    startMs,
    authMs: 0,
    permissionsMs: 0,
    tenantMs: 0,
    dbMs: 0,
    queries: [],
    renderMs: 0,
    totalMs: 0,
  };

  const result = await timingStorage.run(ctx, async () => {
    return await fn(ctx);
  });

  const endMs = performance.now();
  ctx.totalMs = Math.round((endMs - startMs) * 100) / 100;
  
  // Calculate rendering/CPU time as total minus external network/DB/auth waits
  const nonRenderTime = ctx.authMs + ctx.permissionsMs + ctx.tenantMs + ctx.dbMs;
  ctx.renderMs = Math.max(0, Math.round((ctx.totalMs - nonRenderTime) * 100) / 100);

  const header = formatServerTimingHeader(ctx);

  if (isPerfDebugEnabled()) {
    console.info(formatTimingLog(ctx));
  }

  const timing: TimingSummary = {
    name: ctx.name,
    totalMs: ctx.totalMs,
    authMs: ctx.authMs,
    permissionsMs: ctx.permissionsMs,
    tenantMs: ctx.tenantMs,
    dbMs: ctx.dbMs,
    queryCount: ctx.queries.length,
    renderMs: ctx.renderMs,
    queries: [...ctx.queries],
    serverTimingHeader: header,
  };

  return { result, timing };
}

/**
 * Measures execution time for authentication / session resolution.
 */
export async function trackAuth<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = getTimingContext();
  if (!ctx) return await fn();

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = Math.round((performance.now() - start) * 100) / 100;
    ctx.authMs = Math.round((ctx.authMs + dur) * 100) / 100;
  }
}

/**
 * Measures execution time for permission resolution and role matrix evaluation.
 */
export async function trackPermissions<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = getTimingContext();
  if (!ctx) return await fn();

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = Math.round((performance.now() - start) * 100) / 100;
    ctx.permissionsMs = Math.round((ctx.permissionsMs + dur) * 100) / 100;
  }
}

/**
 * Measures execution time for tenant lookup, isolation check, and membership setup.
 */
export async function trackTenant<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = getTimingContext();
  if (!ctx) return await fn();

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = Math.round((performance.now() - start) * 100) / 100;
    ctx.tenantMs = Math.round((ctx.tenantMs + dur) * 100) / 100;
  }
}

/**
 * Measures individual database query execution (Supabase PostgREST or Prisma).
 */
export async function trackQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = Math.round((performance.now() - start) * 100) / 100;
    recordQuery(name, dur);
  }
}

/**
 * Records a completed database query metric into the active context.
 */
export function recordQuery(name: string, durationMs: number): void {
  const ctx = getTimingContext();
  if (!ctx) return;

  const rounded = Math.round(durationMs * 100) / 100;
  ctx.queries.push({ name, duration: rounded });
  ctx.dbMs = Math.round((ctx.dbMs + rounded) * 100) / 100;
}

/**
 * Generates the standard Server-Timing HTTP response header.
 * Visible in Chrome/Edge/Firefox DevTools Network Tab -> Timing.
 */
export function formatServerTimingHeader(ctx?: TimingContext): string {
  const c = ctx || getTimingContext();
  if (!c) {
    return 'total;dur=0;desc="Total"';
  }

  const parts = [
    `total;dur=${c.totalMs};desc="Total"`,
    `auth;dur=${c.authMs};desc="Auth"`,
    `permissions;dur=${c.permissionsMs};desc="Permissions"`,
    `tenant;dur=${c.tenantMs};desc="Tenant"`,
    `db;dur=${c.dbMs};desc="DB (${c.queries.length} queries)"`,
    `render;dur=${c.renderMs};desc="Render"`,
  ];

  return parts.join(", ");
}

/**
 * Formats a clean single-line performance debug log.
 */
export function formatTimingLog(ctx: TimingContext): string {
  const qStr = ctx.queries.length > 0 
    ? ` [${ctx.queries.map(q => `${q.name}:${q.duration}ms`).join(", ")}]`
    : "";
  return `[PERF_DEBUG] ${ctx.name}: total=${ctx.totalMs}ms | auth=${ctx.authMs}ms | perm=${ctx.permissionsMs}ms | tenant=${ctx.tenantMs}ms | db=${ctx.dbMs}ms (${ctx.queries.length} queries)${qStr} | render=${ctx.renderMs}ms`;
}
