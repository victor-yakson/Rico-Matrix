// /proxy.ts
import { NextRequest, NextResponse } from "next/server";

function normalizeIp(ip: string): string {
  if (!ip) return "127.0.0.1";

  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }

  if (ip === "::1") {
    return "127.0.0.1";
  }

  return ip.trim();
}

function getIP(req: NextRequest): string {
  const rawIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "127.0.0.1";

  return normalizeIp(rawIp);
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1") return true;
  if (ip === "0.0.0.0") return true;

  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;

  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Geo-blocking
// ---------------------------------------------------------------------------
const geoCache = new Map<string, string>();

async function getCountryCode(ip: string): Promise<string> {
  if (isPrivateIp(ip)) {
    return "UNKNOWN";
  }

  const cached = geoCache.get(ip);
  if (cached) return cached;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });

    if (!res.ok) {
      return "UNKNOWN";
    }

    const data = await res.json();
    const code = typeof data?.countryCode === "string" ? data.countryCode : "UNKNOWN";

    geoCache.set(ip, code);
    return code;
  } catch {
    // Fail open
    return "UNKNOWN";
  }
}

const BLOCKED_COUNTRIES = new Set([""]);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const PUBLIC_PATHS = [
  "/",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/blocked",
  "/manifest.json",
];

const PROTECTED_PREFIXES = [
  "/library",
  "/chapters",
  "/royalty",
  "/profile",
  "/rico",
  "/skills",
  "/documentation",
];

const TRACKING_SKIP_PREFIXES = ["/api", "/_next", "/static"];
const TRACKING_SKIP_EXACT = [
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/blocked",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path),
  );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((path) => pathname.startsWith(path));
}

function shouldSkipTracking(pathname: string): boolean {
  if (TRACKING_SKIP_EXACT.includes(pathname)) return true;
  return TRACKING_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = getIP(req);
  const userAgent = req.headers.get("user-agent") || "";

  // Prevent redirect loop for the blocked page itself
  if (path === "/blocked") {
    return NextResponse.next();
  }

  // Geo-block first
  const country = await getCountryCode(ip);
  if (BLOCKED_COUNTRIES.has(country)) {
    return NextResponse.redirect(new URL("/blocked", req.url));
  }

  // Wallet protection for selected areas
  if (!isPublicPath(path) && isProtectedPath(path)) {
    const isConnected = req.cookies.get("walletConnected")?.value === "1";

    if (!isConnected) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("from", path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Skip tracking for static/system paths
  if (shouldSkipTracking(path)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // Pass tracking metadata
  res.headers.set("x-track-ip", ip);
  res.headers.set("x-track-ua", userAgent);
  res.headers.set("x-track-path", path);

  // Fire-and-forget tracking
  fetch(`${req.nextUrl.origin}/api/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-track-ip": ip,
      "x-track-ua": userAgent,
      "x-track-path": path,
    },
    cache: "no-store",
  }).catch((error) => {
    console.error("Failed to track visit:", error);
  });

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};