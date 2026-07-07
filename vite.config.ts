import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Cloudflare Pages serves the built `dist/` and runs `functions/` alongside it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
