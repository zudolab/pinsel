import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Runs every test inside workerd against a real local D1 (migrations applied
// per test file). The Node-side home HTML is computed here, in Node, so the
// in-workerd projection can be compared byte for byte; the ZFB build output is
// passed along when `pnpm build:site` has run.
export default defineConfig(async () => {
  const here = import.meta.dirname;
  const root = path.resolve(here, "../..");
  const migrations = await readD1Migrations(path.join(here, "migrations"));
  // The assets binding needs its directory to exist; CI stages it later than `pnpm test`.
  const assetsDir = path.join(here, "dist-assets");
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
  const nodeHomeHtml = execFileSync("corepack", ["pnpm", "--filter", "@pinsel/content", "--silent", "content:render-home"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const zfbDist = path.join(root, "apps/site/dist/index.html");
  const zfbHomeHtml = existsSync(zfbDist) ? readFileSync(zfbDist, "utf8") : "";
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, NODE_HOME_HTML: nodeHomeHtml, ZFB_HOME_HTML: zfbHomeHtml } },
      }),
    ],
    test: {
      name: "authoring-worker",
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      // Local D1 batches take ~1s each in workerd; API scenarios chain several.
      testTimeout: 60_000,
    },
  };
});
