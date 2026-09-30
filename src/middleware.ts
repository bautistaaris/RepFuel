import { NextResponse, type NextRequest } from "next/server";
import { decodeSessionToken } from "@/lib/session-edge";

const SESSION_COOKIE = "rf_session";
const CSRF_COOKIE = "csrf_token";
const PUBLIC_PATHS = new Set<string>(["/login", "/manifest.webmanifest", "/sw.js", "/robots.txt"]);
const PUBLIC_PREFIXES = ["/_next", "/api/health", "/icons"];

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeSessionToken(token) : null;

  const res = isPublic ? NextResponse.next() : (() => {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  })();

  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const csrf = base64url(bytes);
    const isHttps = req.nextUrl.protocol === "https:";
    res.cookies.set(CSRF_COOKIE, csrf, {
      httpOnly: false,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|icons).*)",
  ],
};