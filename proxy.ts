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
  return ip;
}

function getIP(req: NextRequest) {
  const rawIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "127.0.0.1";

  return normalizeIp(rawIp);
}

const PUBLIC_PATHS = [
  "/",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
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

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  );

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((path) => pathname.startsWith(path));

// Default export instead of named export
export default function middleware(req: NextRequest) {
  const ip = getIP(req);
  const userAgent = req.headers.get("user-agent") || "";
  const path = req.nextUrl.pathname;

  if (!isPublicPath(path) && isProtectedPath(path)) {
    const isConnected = req.cookies.get("walletConnected")?.value === "1";
    if (!isConnected) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("from", path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Skip tracking for API routes, static files, and favicon
  const skipPaths = ["/api", "/_next", "/favicon.ico", "/static"];
  if (skipPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // Set headers for the visit tracking API
  res.headers.set("x-track-ip", ip);
  res.headers.set("x-track-ua", userAgent);
  res.headers.set("x-track-path", path);

  // Fire-and-forget: Track the visit asynchronously
  fetch(`${req.nextUrl.origin}/api/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-track-ip": ip,
      "x-track-ua": userAgent,
      "x-track-path": path,
    },
  }).catch((error) => {
    console.error("Failed to track visit:", error);
  });

  return res;
}

// Config still needs to be named export
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};
