import "server-only";
import { prisma } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_PROBABILITY = 0.01;

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

async function cleanupExpired(now: number): Promise<void> {
  // Probabilistic to avoid hot path overhead
  if (Math.random() > CLEANUP_PROBABILITY) return;
  try {
    const cutoff = new Date(now - WINDOW_MS * 2);
    await prisma.rateLimitAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  } catch {
    // best-effort; rate limiting should not crash the request
  }
}

async function recordAndCount(key: string, now: number): Promise<{ count: number; resetAt: number }> {
  const resetAt = now + WINDOW_MS;
  await prisma.rateLimitAttempt.create({
    data: {
      key,
      resetAt: new Date(resetAt),
      createdAt: new Date(now),
    },
  });
  const count = await prisma.rateLimitAttempt.count({
    where: {
      key,
      createdAt: { gte: new Date(now - WINDOW_MS) },
    },
  });
  return { count, resetAt };
}

async function currentCount(key: string, now: number): Promise<{ count: number; oldestResetAt: number } | null> {
  const since = new Date(now - WINDOW_MS);
  const first = await prisma.rateLimitAttempt.findFirst({
    where: { key, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });
  if (!first) return null;
  const count = await prisma.rateLimitAttempt.count({
    where: { key, createdAt: { gte: since } },
  });
  return { count, oldestResetAt: first.createdAt.getTime() + WINDOW_MS };
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const now = Date.now();
  await cleanupExpired(now);
  const current = await currentCount(key, now);
  if (current && current.count >= MAX_REQUESTS) {
    return { ok: false, retryAfterSec: Math.ceil((current.oldestResetAt - now) / 1000) };
  }
  await recordAndCount(key, now);
  return { ok: true, retryAfterSec: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitAttempt.deleteMany({ where: { key } });
}

// Periodic background cleanup (call from a long-lived context, e.g. server startup hook).
let cleanupStarted = false;
export function startRateLimitCleanup(): void {
  if (cleanupStarted) return;
  cleanupStarted = true;
  const tick = () => {
    const cutoff = new Date(Date.now() - WINDOW_MS * 2);
    prisma.rateLimitAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
  };
  setInterval(tick, CLEANUP_INTERVAL_MS).unref?.();
}

// Test-only helper
export const __rateLimitInternals = { WINDOW_MS, MAX_REQUESTS };