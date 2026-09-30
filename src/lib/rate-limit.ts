import "server-only";
import { checkRateLimit as pgCheck, resetRateLimit as pgReset } from "./rate-limit-pg";
import { checkLoginRateLimit as memCheck, resetLoginRateLimit as memReset } from "./rate-limit";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

function isPostgresBackend(): boolean {
  return (process.env.RATE_LIMIT_BACKEND ?? "").toLowerCase() === "postgres";
}

export async function checkLoginRateLimit(key: string): Promise<RateLimitResult> {
  if (isPostgresBackend()) return pgCheck(key);
  return memCheck(key);
}

export async function resetLoginRateLimit(key: string): Promise<void> {
  if (isPostgresBackend()) return pgReset(key);
  memReset(key);
}