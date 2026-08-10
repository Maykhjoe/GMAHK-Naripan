import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

type MemoryEntry = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryEntry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  unavailable?: boolean;
  source: "database" | "memory" | "unavailable";
};

type DatabaseRateLimitRow = {
  allowed?: boolean | null;
  remaining?: number | null;
  reset_at?: string | null;
};

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function retryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfter: retryAfterSeconds(resetAt),
      source: "memory",
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfter: retryAfterSeconds(current.resetAt),
      source: "memory",
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
    retryAfter: retryAfterSeconds(current.resetAt),
    source: "memory",
  };
}

function firstDatabaseRow(value: unknown): DatabaseRateLimitRow | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object"
      ? (first as DatabaseRateLimitRow)
      : null;
  }

  return value && typeof value === "object"
    ? (value as DatabaseRateLimitRow)
    : null;
}

export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, Math.min(10_000, Math.floor(limit)));
  const safeWindowMs = Math.max(1_000, Math.min(86_400_000, windowMs));
  const hashedKey = hashKey(key.slice(0, 2_000));
  const admin = createAdminClient();

  // Local development remains usable without service-role configuration. In
  // production we fail closed instead of silently falling back to per-process
  // memory, which is not reliable across serverless/multi-instance deployments.
  if (!admin) {
    if (process.env.NODE_ENV !== "production") {
      return memoryRateLimit(hashedKey, safeLimit, safeWindowMs);
    }

    const resetAt = Date.now() + safeWindowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: retryAfterSeconds(resetAt),
      unavailable: true,
      source: "unavailable",
    };
  }

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key_hash: hashedKey,
    p_limit: safeLimit,
    p_window_seconds: Math.max(1, Math.ceil(safeWindowMs / 1_000)),
  });

  const row = firstDatabaseRow(data);

  if (error || !row || typeof row.allowed !== "boolean") {
    console.error("[security:rate-limit] distributed limiter unavailable", {
      code: error?.code,
      message: error?.message,
    });

    if (process.env.NODE_ENV !== "production") {
      return memoryRateLimit(hashedKey, safeLimit, safeWindowMs);
    }

    const resetAt = Date.now() + safeWindowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: retryAfterSeconds(resetAt),
      unavailable: true,
      source: "unavailable",
    };
  }

  const parsedReset = row.reset_at ? Date.parse(row.reset_at) : Number.NaN;
  const resetAt = Number.isFinite(parsedReset)
    ? parsedReset
    : Date.now() + safeWindowMs;

  return {
    allowed: row.allowed,
    remaining: Math.max(0, Number(row.remaining ?? 0)),
    resetAt,
    retryAfter: retryAfterSeconds(resetAt),
    source: "database",
  };
}

export function clientKey(request: Request) {
  const candidate =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";

  return candidate.trim().slice(0, 128) || "local";
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfter),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };
}

export function rateLimitFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
