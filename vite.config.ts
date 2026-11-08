import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/** Files the service worker never precaches: itself, and the music, which streams instead. */
const NOT_SHELL = (file: string): boolean => file === "sw.js" || file.startsWith("music/") || file.endsWith(".map");

const listFiles = (dir: string, root = dir): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, root) : [relative(root, path).split(sep).join("/")];
  });

/**
 * Stamps dist/sw.js (copied from public/) with this build's id and app-shell file list,
 * so the installed game opens offline and a new deploy replaces the old cache in one go.
 */
const pwaShell = (): Plugin => {
  let outDir = "dist";
  return {
    name: "trenchess-pwa-shell",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, "sw.js");
      const files = listFiles(outDir).filter((f) => !NOT_SHELL(f)).sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const buildId = hash.digest("hex").slice(0, 12);
      const sw = readFileSync(swPath, "utf8")
        .replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${buildId}';`)
        .replace("const SHELL_FILES = [];", `const SHELL_FILES = ${JSON.stringify(files.filter((f) => f !== "index.html"))};`);
      writeFileSync(swPath, sw);
    },
  };
};

export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
  plugins: [pwaShell()],
  build: { chunkSizeWarningLimit: 2000 },
  worker: { format: "es" },
});
