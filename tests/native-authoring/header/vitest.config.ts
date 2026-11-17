import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/native-authoring/header/*.test.mjs"], environment: "node" } });
