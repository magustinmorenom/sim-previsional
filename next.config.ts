import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["pdf-lib"]
  }
};

export default nextConfig;
