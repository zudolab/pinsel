import { defineConfig } from "vitest/config";

// Browser lanes (Playwright, tests/browser/**) are never part of this run.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "scripts",
          include: ["scripts/**/*.test.mjs"],
          environment: "node",
        },
      },
      {
        test: {
          name: "native-family-proofs",
          include: ["tests/native-authoring/families/*.test.mjs"],
          environment: "node",
        },
      },
      {
        test: {
          name: "native-header-proofs",
          include: ["tests/native-authoring/header/*.test.mjs"],
          environment: "node",
        },
      },
      "apps/*/vitest.config.ts",
      "packages/*/vitest.config.ts",
    ],
  },
});
