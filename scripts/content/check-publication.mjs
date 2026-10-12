// Publication-time gate: checks a built dist/ against a snapshot's Content
// entries through the route/DOM mapping table (packages/pinsel-content/src/
// publication-map.ts), plus routes, fragments, art windows, asset paths, the
// metadata policy and the protected fields recorded in content/baseline.json.
// Usage: node scripts/content/check-publication.mjs --dist <dir> [--entries <content/entries dir> | --snapshot <snapshot record json>] [--baseline <file>]
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { tsImport } from "tsx/esm/api";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @param {string} name */
const loadTs = (name) => tsImport(pathToFileURL(path.join(repoRoot, "packages/pinsel-content/src", name)).href, import.meta.url);

/** @param {string} html */
export function parseHtml(html) {
  const window = new Window({ settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
  return new window.DOMParser().parseFromString(html, "text/html");
}

/**
 * @param {{ dist: string, entries: readonly unknown[], baseline: unknown }} options
 * @returns {Promise<string[]>}
 */
export async function runPublicationCheck({ dist, entries, baseline }) {
  const { checkPublication } = await loadTs("publication/check-publication.ts");
  const { outputFileForRoute, PINSEL_ROUTES } = await loadTs("invariants.ts");
  /** @type {Map<string, unknown>} */
  const pages = new Map();
  for (const route of PINSEL_ROUTES) {
    const html = await readFile(path.join(dist, outputFileForRoute(route)), "utf8").catch(() => undefined);
    if (html !== undefined) pages.set(route, parseHtml(html));
  }
  return checkPublication({ entries, baseline, page: (/** @type {string} */ route) => pages.get(route) });
}

/** @param {string} flag */
function argument(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const dist = argument("--dist");
  if (!dist) throw new Error("--dist <dir> is required");
  const snapshot = argument("--snapshot");
  let entries;
  if (snapshot) {
    const record = JSON.parse(await readFile(snapshot, "utf8"));
    entries = record.project?.providers?.content?.find((/** @type {{ id: string }} */ provider) => provider.id === "content-filesystem")?.entries;
    if (!Array.isArray(entries)) throw new Error(`${snapshot} carries no content-filesystem entries`);
  } else {
    const { readContentEntries } = await loadTs("site/entries.ts");
    const entriesDir = argument("--entries");
    entries = await readContentEntries(entriesDir ? path.resolve(entriesDir, "../..") : repoRoot);
  }
  const baseline = JSON.parse(await readFile(argument("--baseline") ?? path.join(repoRoot, "content/baseline.json"), "utf8"));
  const issues = await runPublicationCheck({ dist: path.resolve(dist), entries, baseline });
  if (issues.length > 0) {
    console.error(`check-publication: ${issues.length} problem(s):\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`check-publication ok: ${entries.length} entries against ${path.relative(process.cwd(), path.resolve(dist)) || "."} (14 routes)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
