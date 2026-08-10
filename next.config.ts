import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/lib/security/headers";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(isDevelopment),
      },
    ];
  },
};

export default nextConfig;
