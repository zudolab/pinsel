import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/native-authoring/static/*.test.mjs"] } });
