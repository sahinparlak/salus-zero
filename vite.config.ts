import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

// Which commit is this bundle? Rendered in the footer hairline so "am I on
// the new version?" is answerable by eye — stale-cache debugging cost us a
// live session once (11 Tem).
let buildRef = "dev";
try {
  buildRef = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* not a git checkout — stamp stays "dev" */
}

// Cloudflare Pages serves the built `dist/` and runs `functions/` alongside it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_REF__: JSON.stringify(buildRef),
  },
  server: {
    fs: {
      // The dev server must never serve worker-only source: functions/ holds
      // the hidden ground truth (prod is unaffected — this is `pnpm dev` only).
      deny: ["functions/**"],
    },
  },
});
