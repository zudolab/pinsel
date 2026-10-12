import { describe, expect, it } from "vitest";
import { findDeployCommands, scan } from "./no-deploy-check.mjs";

describe("findDeployCommands", () => {
  it.each([
    "wrangler deploy --dry-run --outdir .wrangler/dry-run",
    "pnpm --filter @pinsel/authoring-worker dry-run",
    "wrangler types --check",
    "wrangler versions upload",
  ])("allows %s", (command) => {
    expect(findDeployCommands(command)).toEqual([]);
  });

  it.each([
    "wrangler deploy",
    "npx wrangler deploy --outdir out",
    "pnpm build && wrangler deploy",
    "wrangler deploy --dry-run && wrangler deploy",
    "wrangler@4.149.0 deploy",
    "wrangler versions deploy",
    "wrangler publish",
    "wrangler pages deploy dist",
  ])("rejects %s", (command) => {
    expect(findDeployCommands(command)).not.toEqual([]);
  });
});

describe("repository scan", () => {
  it("finds no deploy commands", async () => {
    expect(await scan()).toEqual([]);
  });
});
