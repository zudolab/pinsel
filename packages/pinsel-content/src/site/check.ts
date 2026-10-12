// `pnpm content:check`: content:validate, then content:assemble + content:project
// (Node release compiler), then the projected plan against the committed
// golden tests/golden/routes.snapshot.json. `--update` rewrites the golden;
// only do that deliberately, after reviewing the diff.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { JsonValue } from "@zudo-composer/component-contract";
import { canonicalStringifyJson } from "zudo-composer/content";

import { assemble } from "./assemble";
import { readContentEntries, REPO_ROOT, SITE_PROJECT_PATH } from "./entries";
import { structurePack } from "./pack";
import { NAVIGATION_OUT, PLAN_OUT, ROUTES_OUT, navigationModule, projectSite, routesModule, type ProjectedPlan } from "./project";
import { validateContent } from "./validate";

export const GOLDEN_PATH = join(REPO_ROOT, "tests/golden/routes.snapshot.json");

export function goldenText(plan: ProjectedPlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

/** First differing route/path between two plans, for a readable failure. */
export function firstDifference(expected: unknown, actual: unknown, path = "$"): string | undefined {
  if (canonicalStringifyJson(expected as JsonValue) === canonicalStringifyJson(actual as JsonValue)) return undefined;
  if (typeof expected !== "object" || typeof actual !== "object" || expected === null || actual === null || Array.isArray(expected) !== Array.isArray(actual)) {
    return `${path}: expected ${JSON.stringify(expected)?.slice(0, 200)}, got ${JSON.stringify(actual)?.slice(0, 200)}`;
  }
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of keys) {
    const found = firstDifference((expected as Record<string, unknown>)[key], (actual as Record<string, unknown>)[key], Array.isArray(expected) ? `${path}[${key}]` : `${path}.${key}`);
    if (found) return found;
  }
  return path;
}

async function main(): Promise<void> {
  const update = process.argv.includes("--update");
  const pack = structurePack();
  const entries = await readContentEntries();
  const report = await validateContent(entries, pack);
  if (report.issues.length > 0) {
    console.error(`content:check: validation failed:\n${report.issues.map((issue) => `  - ${issue}`).join("\n")}`);
    process.exit(1);
  }
  await assemble();
  const projection = await projectSite(SITE_PROJECT_PATH, pack);
  const portable = canonicalStringifyJson(report.routes as unknown as JsonValue);
  if (portable !== canonicalStringifyJson(projection.plan.routes as unknown as JsonValue)) {
    console.error(`content:check: the portable plan differs from the Node release compiler's: ${firstDifference(report.routes, projection.plan.routes)}`);
    process.exit(1);
  }
  const source = "packages/pinsel-content/.site-project/site-project.json";
  await writeFile(PLAN_OUT, `${JSON.stringify({ projectSourceRevision: projection.projectSourceRevision, plan: projection.plan }, null, 2)}\n`);
  await mkdir(dirname(ROUTES_OUT), { recursive: true });
  await writeFile(ROUTES_OUT, routesModule(projection, source));
  await writeFile(NAVIGATION_OUT, navigationModule(projection, source));
  const actual = goldenText(projection.plan);
  if (update) {
    await mkdir(dirname(GOLDEN_PATH), { recursive: true });
    await writeFile(GOLDEN_PATH, actual);
    console.log(`content:check: wrote ${GOLDEN_PATH}`);
    return;
  }
  const expected = await readFile(GOLDEN_PATH, "utf8").catch(() => undefined);
  if (expected === undefined) {
    console.error(`content:check: ${GOLDEN_PATH} is missing; run with --update to create it deliberately`);
    process.exit(1);
  }
  if (expected !== actual) {
    console.error(`content:check: projected routes differ from the golden: ${firstDifference(JSON.parse(expected), JSON.parse(actual))}\n  (re-run with --update only if the change is intended)`);
    process.exit(1);
  }
  console.log(`content:check ok: ${entries.length} entries, ${projection.plan.routes.length} routes, plan equals ${join("tests/golden", "routes.snapshot.json")} (revision ${projection.projectSourceRevision.slice(0, 12)}…)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
