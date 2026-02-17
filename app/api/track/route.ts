import { NextRequest, NextResponse } from "next/server";
import { Visit } from "@/lib/models/Visit";
import { initializeDatabase } from "@/lib/db-setup";
import axios from "axios";
import { Op } from "sequelize";

let dbInitialized = false;
let geoip: any = null;

// Try to load geoip-lite, but don't crash if it fails
try {
  geoip = require("geoip-lite");
} catch (e) {
  console.warn("⚠️ GeoIP database not available. Using API fallback.");
}

// Normalize IPv4-mapped IPv6 addresses
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

// Check if IP is private/internal
function isPrivateIp(ip: string): boolean {
  const normalizedIp = normalizeIp(ip);
  return (
    normalizedIp === "127.0.0.1" ||
    normalizedIp === "::1" ||
    normalizedIp.startsWith("192.168.") ||
    normalizedIp.startsWith("10.") ||
    normalizedIp.startsWith("172.16.") ||
    normalizedIp.startsWith("172.17.") ||
    normalizedIp.startsWith("172.18.") ||
    normalizedIp.startsWith("172.19.") ||
    normalizedIp.startsWith("172.20.") ||
    normalizedIp.startsWith("172.21.") ||
    normalizedIp.startsWith("172.22.") ||
    normalizedIp.startsWith("172.23.") ||
    normalizedIp.startsWith("172.24.") ||
    normalizedIp.startsWith("172.25.") ||
    normalizedIp.startsWith("172.26.") ||
    normalizedIp.startsWith("172.27.") ||
    normalizedIp.startsWith("172.28.") ||
    normalizedIp.startsWith("172.29.") ||
    normalizedIp.startsWith("172.30.") ||
    normalizedIp.startsWith("172.31.") ||
    normalizedIp.startsWith("169.254.")
  );
}

async function ensureDb() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

async function getGeoData(ip: string) {
  const normalizedIp = normalizeIp(ip);

  // Default values
  let geoData = {
    country: "Unknown",
    country_code: "XX",
    city: null as string | null,
    latitude: null as number | null,
    longitude: null as number | null,
  };

  // Skip geolocation for private IPs in production only
  if (process.env.NODE_ENV === 'production' && isPrivateIp(normalizedIp)) {
    return geoData;
  }

  // Try geoip-lite first
  if (geoip) {
    try {
      const geo = geoip.lookup(normalizedIp);
      if (geo) {
        return {
          country: geo.country || "Unknown",
          country_code: geo.country || "XX",
          city: geo.city || null,
          latitude: geo.ll?.[0] ?? null,
          longitude: geo.ll?.[1] ?? null,
        };
      }
    } catch (error) {
      console.error("GeoIP-lite lookup failed:", error);
    }
  }

  // Fallback to free API
  try {
    const response = await axios.get(
      `https://ip-api.com/json/${normalizedIp}?fields=status,message,country,countryCode,city,lat,lon`,
      {
        timeout: 3000,
      },
    );

    if (response.data && response.data.status === "success") {
      return {
        country: response.data.country || "Unknown",
        country_code: response.data.countryCode || "XX",
        city: response.data.city || null,
        latitude: response.data.lat || null,
        longitude: response.data.lon || null,
      };
    }
  } catch (error) {
    console.error("Fallback geolocation API failed:", error);
  }

  return geoData;
}

export async function POST(req: NextRequest) {
  try {
    await ensureDb();

    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const rawIp =
      req.headers.get("x-track-ip") ||
      (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ||
      realIp ||
      "127.0.0.1";
    const ip = normalizeIp(rawIp);
    const ua = req.headers.get("x-track-ua") || "";
    const path = req.headers.get("x-track-path") || "/";

    // 🔧 FIXED: Only skip private IPs in production
    // In development, we want to track even localhost for testing
    if (process.env.NODE_ENV === 'production' && isPrivateIp(ip)) {
      return NextResponse.json({
        ok: true,
        message: "Internal IP, skipping tracking",
        ip: ip,
      });
    }

    // Check if user has been added before (within last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const existingVisit = await Visit.findOne({
      where: {
        ip_address: ip,
        timestamp: {
          [Op.gte]: oneDayAgo,
        },
      },
    });

    if (existingVisit) {
      return NextResponse.json({
        ok: true,
        message: "User already tracked in last 24 hours",
        existing_visit_id: existingVisit.id,
        ip: ip,
        location: {
          country: existingVisit.country,
          city: existingVisit.city,
          coordinates:
            existingVisit.latitude && existingVisit.longitude
              ? {
                  latitude: existingVisit.latitude,
                  longitude: existingVisit.longitude,
                }
              : null,
        },
      });
    }

    // Get geolocation data
    let geoData;
    
    // 🔧 FIXED: Add mock data for development on private IPs
    if (process.env.NODE_ENV === 'development' && isPrivateIp(ip)) {
      // Mock data for development/testing
      geoData = {
        country: "United States",
        country_code: "US",
        city: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
      };
    } else {
      geoData = await getGeoData(ip);
    }

    // Create visit record with normalized IP
    const visit = await Visit.create({
      ip_address: ip,
      user_agent: ua,
      country: geoData.country,
      country_code: geoData.country_code,
      city: geoData.city,
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      path,
      timestamp: new Date(),
    });


    return NextResponse.json({
      ok: true,
      id: visit.id,
      is_new_visitor: true,
      ip: ip,
      location: {
        country: geoData.country,
        city: geoData.city,
        coordinates:
          geoData.latitude && geoData.longitude
            ? {
                latitude: geoData.latitude,
                longitude: geoData.longitude,
              }
            : null,
      },
    });
  } catch (error) {
    console.error("❌ Error recording visit:", error);
    return NextResponse.json({
      ok: true,
      error: error instanceof Error ? error.message : "Failed to record visit",
    });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
