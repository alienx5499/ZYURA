import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Enable Turbopack filesystem caching for faster builds (2-5x faster)
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
