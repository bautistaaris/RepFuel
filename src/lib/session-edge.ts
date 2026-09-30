/**
 * Edge-compatible session decoding (Web Crypto / SubtleCrypto).
 * Used by middleware which runs in Edge runtime.
 */

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me-please-32-chars";

type SessionPayload = { userId: string; exp: number };

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
void base64UrlEncode;

function bytesToString(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return bin;
}

function stringToBytes(s: string): Uint8Array {
  const bin = unescape(encodeURIComponent(s));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const data = stringToBytes(secret);
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  return crypto.subtle.importKey(
    "raw",
    buf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(key: CryptoKey, data: string): Promise<Uint8Array> {
  const d = stringToBytes(data);
  const buf = new ArrayBuffer(d.byteLength);
  new Uint8Array(buf).set(d);
  const sig = await crypto.subtle.sign("HMAC", key, buf);
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function decodeSessionToken(token: string): Promise<SessionPayload | null> {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const data = token.slice(0, idx);
  const macStr = token.slice(idx + 1);
  let mac: Uint8Array;
  try {
    mac = base64UrlDecode(macStr);
  } catch {
    return null;
  }
  const key = await importHmacKey(SECRET);
  const expected = await hmacSign(key, data);
  if (!timingSafeEqual(mac, expected)) return null;
  try {
    const json = bytesToString(base64UrlDecode(data));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}