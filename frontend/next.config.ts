import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://resume-api.totalcareservices.me";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: "standalone",

  // Keep Turbopack inside this frontend project when another lockfile exists higher up.
  turbopack: {
    root: process.cwd(),
  },

  // Proxy API calls to the FastAPI backend during development or production fallback
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
