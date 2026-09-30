import "server-only";
import { readCsrfCookie } from "@/lib/session";

export async function getSessionCsrf(): Promise<string> {
  const existing = await readCsrfCookie();
  return existing ?? "";
}