import "server-only";
import { readCsrfCookie } from "@/lib/session";
import crypto from "crypto";

export async function getSessionCsrf(): Promise<string> {
  const existing = await readCsrfCookie();
  if (existing) return existing;
  return crypto.randomBytes(24).toString("base64url");
}