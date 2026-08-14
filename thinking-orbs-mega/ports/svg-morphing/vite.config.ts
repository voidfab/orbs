import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the demo site (GitHub Pages). The library itself is built by tsup.
export default defineConfig({
  root: "demo",
  base: process.env.DEMO_BASE ?? "/",
  plugins: [react()],
  build: { outDir: "../dist-demo", emptyOutDir: true },
});
