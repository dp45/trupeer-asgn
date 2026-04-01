import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large video files in public/
  experimental: {
    // Disable static optimization for API routes that read fs
  },
};

export default nextConfig;
