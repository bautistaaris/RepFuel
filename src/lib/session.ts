import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me-please-32-chars";

const SESSION_COOKIE = "rf_session";
const CSRF_COOKIE = "csrf_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function sign(data: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${mac}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const data = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return data;
}

export type SessionPayload = {
  userId: string;
  exp: number;
};

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return sign(encoded);
}

export function decodeSessionToken(token: string): SessionPayload | null {
  const data = unsign(token);
  if (!data) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSession(userId: string): Promise<void> {
  const token = createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  await ensureCsrfCookie();
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = decodeSessionToken(token);
  return payload?.userId ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

export async function ensureCsrfCookie(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{24,}$/.test(existing)) {
    return existing;
  }
  const token = crypto.randomBytes(24).toString("base64url");
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return token;
}

export async function readCsrfCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CSRF_COOKIE)?.value ?? null;
}

export async function verifyCsrf(headerToken: string | null | undefined): Promise<boolean> {
  if (!headerToken) return false;
  const cookieToken = await readCsrfCookie();
  if (!cookieToken) return false;
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}