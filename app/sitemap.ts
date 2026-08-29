import type { MetadataRoute } from "next";

const SITE_URL = "https://ricomatrix.com";

// Only the marketing landing page is confirmed open to unauthenticated
// visitors (proxy.ts redirects /library, /chapters, /royalty, /rewards,
// /profile, /rico, /skills, and /documentation to "/" without a connected
// wallet). Add more entries here once other routes are confirmed public.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
