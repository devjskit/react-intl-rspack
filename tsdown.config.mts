import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  deps: {
    neverBundle: ["react-intl", "@rsbuild/core"],
  },
  format: ["esm"],
  sourcemap: false,
  treeshake: true,
  exports: true,
  minify: true,
  clean: true,
  dts: true,
  fixedExtension: false,
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
});
