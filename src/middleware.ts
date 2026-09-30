import { NextResponse, type NextRequest } from "next/server";
import { decodeSessionToken } from "@/lib/session";

const SESSION_COOKIE = "rf_session";
const PUBLIC_PATHS = new Set<string>(["/login", "/manifest.webmanifest", "/sw.js", "/robots.txt"]);
const PUBLIC_PREFIXES = ["/_next", "/api/health", "/icons"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeSessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|icons).*)",
  ],
};