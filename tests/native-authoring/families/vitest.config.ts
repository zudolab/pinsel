import { defineConfig } from "vitest/config";

// Standalone pure proof tests; the root native-family-proofs project also runs these in CI.
export default defineConfig({
  test: { include: ["tests/native-authoring/families/*.test.mjs"], environment: "node" },
});
