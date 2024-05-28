/// <reference types="vitest" />
import { resolve } from "path";

import react from "@vitejs/plugin-react-swc";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

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
            name: "cheshirecode-sample-refresh-token",
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
    setupFiles: ["vitest-localstorage-mock"],
    include: ["**/*(*.)?{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [...configDefaults.exclude, "src/test/**/*"],
  },
}));
