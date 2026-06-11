import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // suitrace-sdk is consumed from npm (compiled dist), so no transpile needed.
  allowedDevOrigins: ["10.0.0.3", "100.75.130.68"]
};

export default nextConfig;
