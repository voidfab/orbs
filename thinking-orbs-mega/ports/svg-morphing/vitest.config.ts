import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose: that file's root is the demo app,
// and vitest would inherit it and find no tests. The suite lives in src/.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
