import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 1. INCREASE BODY SIZE LIMIT
  // Note: For App Router, this applies to the underlying infrastructure.
  // In some Next.js versions, this is handled via 'experimental' or direct API config.
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },

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
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
      "pdfjs-dist/build/pdf.mjs": "pdfjs-dist/legacy/build/pdf.js",
    };

    return config;
  },
};

export default withNextIntl(nextConfig);