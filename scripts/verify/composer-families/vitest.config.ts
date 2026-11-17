import { defineConfig } from "vitest/config";

// Standalone pure proof tests; the root scripts project also runs these in CI.
export default defineConfig({
  test: { include: ["scripts/verify/composer-families/*.test.mjs"], environment: "node" },
});
