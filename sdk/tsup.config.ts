import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"], // dual: works with both `import` and `require`
  dts: true,              // emit dist/index.d.ts
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  // peers / runtime deps stay external, not bundled into dist
  external: ["@mysten/sui", "js-sha256"],
});
