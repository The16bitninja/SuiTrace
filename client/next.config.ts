import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SDK package ships raw TypeScript (exports ./src/index.ts), so Next
  // must transpile it rather than treating it as precompiled node_modules.
  transpilePackages: ["suitrace-sdk"],
  allowedDevOrigins: ["10.0.0.3", "100.75.130.68"]
};

export default nextConfig;
