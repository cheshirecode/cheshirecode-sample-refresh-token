import { resolve } from "path";

import react from "@vitejs/plugin-react-swc";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

const isSite = !!process.env.SITE;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
  build: isSite
    ? { outDir: "site" }
    : {
        lib: {
          entry: resolve(__dirname, "lib/main.ts"),
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
      },
});
