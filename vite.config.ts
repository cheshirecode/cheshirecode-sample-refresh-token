/// <reference types="vitest" />
import { resolve } from "path";

import react from "@vitejs/plugin-react-swc";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import { configDefaults, coverageConfigDefaults } from "vitest/config";

const isSite = !!process.env.SITE;

export default defineConfig((config) => ({
  plugins: [react(), UnoCSS()],
  build: {
    // skip minification to make tests faster
    minify: config.mode !== "test" ? "esbuild" : false,
    ...(isSite
      ? { outDir: "site" }
      : {
          lib: {
            entry: resolve(__dirname, "lib/index.ts"),
            name: "cheshirecode-pkce-wrapper",
            // the proper extensions will be added
            fileName: "lib",
          },
          rollupOptions: {
            external: ["react", "unocss"],
            output: {
              globals: {
                react: "react",
              },
            },
          },
        }),
  },
  test: {
    globals: true,
    setupFiles: ["src/services/test/setup.ts"],
    include: ["**/*(*.)?{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [...configDefaults.exclude, "site/**/*"],
    coverage: {
      exclude: [...coverageConfigDefaults.exclude, "site/**/*"],
      reporter: [
        ["lcov", { projectRoot: "./src" }],
        ["json", { file: "coverage.json" }],
        ["text"],
        ["html", { subdir: "./html" }],
      ],
      provider: "v8",
    },
  },
}));
