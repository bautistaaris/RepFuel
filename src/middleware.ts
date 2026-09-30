import { NextResponse, type NextRequest } from "next/server";
import { decodeSessionToken } from "@/lib/session-edge";

const SESSION_COOKIE = "rf_session";
const CSRF_COOKIE = "csrf_token";

const PUBLIC_EXACT = new Set<string>([
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
  "/api/health",
]);

const PUBLIC_PREFIXES = [
  "/_next",
  "/icons",
  "/verify-email/", // /verify-email/[token]
  "/reset-password/", // /reset-password/[token]
  "/fonts",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeSessionToken(token) : null;

  let res: NextResponse;
  if (isPublic) {
    res = NextResponse.next();
    // Authenticated users hitting auth pages → send them home.
    if (session && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
      const home = new URL("/inicio", req.url);
      return NextResponse.redirect(home);
    }
  } else {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    res = NextResponse.next();
  }

  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const csrf = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    const b64 = typeof btoa === "function" ? btoa(csrf) : Buffer.from(csrf, "binary").toString("base64");
    const token2 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const isHttps = req.nextUrl.protocol === "https:";
    res.cookies.set(CSRF_COOKIE, token2, {
      httpOnly: false,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Security headers
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|icons).*)",
  ],
};