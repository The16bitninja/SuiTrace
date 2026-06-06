import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SDK package ships raw TypeScript (exports ./src/index.ts), so Next
  // must transpile it rather than treating it as precompiled node_modules.
  transpilePackages: ["@suitrace/sdk"],
};

export default nextConfig;
