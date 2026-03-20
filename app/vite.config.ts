import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const ssbMotorDir = path.resolve(__dirname, "ssb-motor-src");
const browserCachePath = path.resolve(__dirname, "src/lib/browser-cache.ts");

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "ssb-motor-browser-compat",
      enforce: "pre",
      resolveId(source, importer) {
        if (!importer) return null;

        // Redirect cache.js/cache.ts imports from ssb-motor to browser version
        if (importer.includes("ssb-motor") && /\.\/cache(\.js|\.ts)?$/.test(source)) {
          return browserCachePath;
        }

        // Rewrite .js imports from ssb-motor to .ts
        if (source.endsWith(".js") && importer.includes("ssb-motor")) {
          const tsPath = source.replace(/\.js$/, ".ts");
          return this.resolve(tsPath, importer, { skipSelf: true });
        }

        return null;
      },
    },
  ],
  resolve: {
    alias: {
      "ssb-motor": ssbMotorDir,
    },
  },
  server: {
    proxy: {
      "/api/ssb": {
        target: "https://data.ssb.no",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ssb/, "/api/v0/no/table"),
      },
      "/api/brreg": {
        target: "https://data.brreg.no",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/brreg/, ""),
      },
      "/api/valg": {
        target: "https://valgresultat.no",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/valg/, ""),
      },
    },
  },
});
