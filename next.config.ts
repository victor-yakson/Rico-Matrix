import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(); // will look for src/i18n/request.ts

const nextConfig: NextConfig = {
  // ✅ Serve the pdf worker as JS (prevents "Failed to fetch dynamically imported module")
  async headers() {
    return [
      {
        source: "/pdfjs/:path*",
        headers: [
          { key: "Content-Type", value: "text/javascript; charset=utf-8" },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),

      // your existing aliases
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,

      // ✅ CRITICAL: stop Next from bundling the crashing pdf.mjs build
      "pdfjs-dist/build/pdf.mjs": "pdfjs-dist/legacy/build/pdf.js",
    };

    return config;
  },
};

export default withNextIntl(nextConfig);
