import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
  build: { chunkSizeWarningLimit: 2000 },
  worker: { format: "es" },
});
