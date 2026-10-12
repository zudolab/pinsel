import { defineConfig } from "@playwright/test";

// Browser lanes live under tests/browser and never run inside `pnpm test`
// (vitest); run them through heavy-guard: `pnpm exec playwright test`.
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: ".reports/playwright.json" }]],
  use: { browserName: "chromium" },
});
