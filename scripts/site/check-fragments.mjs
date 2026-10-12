// Every same-site link in the built public site resolves: its path is one of
// the 14 outputs (or a shipped file) and its #fragment is an id on the target
// page; every structure fragment in ROUTE_FRAGMENTS (invariants.ts) exists.
// Usage: node scripts/site/check-fragments.mjs [--dist apps/site/dist]
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import { parseHtml } from "../content/check-publication.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = "https://pinsel.invalid";

/** @param {string} file */
const exists = (file) => stat(file).then((info) => info.isFile(), () => false);

/** @param {string} dist @returns {Promise<string[]>} */
export async function checkFragments(dist) {
  const { PINSEL_ROUTES, ROUTE_FRAGMENTS, outputFileForRoute } = await tsImport(pathToFileURL(path.join(repoRoot, "packages/pinsel-content/src/invariants.ts")).href, import.meta.url);
  /** @type {string[]} */
  const issues = [];
  /** @type {Map<string, Set<string>>} route → ids */
  const ids = new Map();
  /** @type {Map<string, string[]>} route → hrefs */
  const hrefs = new Map();
  for (const route of PINSEL_ROUTES) {
    const html = await readFile(path.join(dist, outputFileForRoute(route)), "utf8").catch(() => undefined);
    if (html === undefined) {
      issues.push(`${route}: ${outputFileForRoute(route)} is missing`);
      continue;
    }
    const page = parseHtml(html);
    ids.set(route, new Set(Array.from(page.querySelectorAll("[id]")).map((element) => element.id)));
    hrefs.set(route, Array.from(page.querySelectorAll("a[href]")).map((element) => element.getAttribute("href") ?? ""));
  }
  for (const route of PINSEL_ROUTES) {
    const pageIds = ids.get(route);
    if (!pageIds) continue;
    for (const fragment of ROUTE_FRAGMENTS[route]) if (!pageIds.has(fragment)) issues.push(`${route}: structure fragment #${fragment} is missing`);
  }
  for (const [route, links] of hrefs) {
    for (const href of links) {
      const url = new URL(href, `${ORIGIN}${route}`);
      if (url.origin !== ORIGIN) continue;
      const pathname = decodeURIComponent(url.pathname);
      const target = PINSEL_ROUTES.find((candidate) => candidate === pathname);
      if (!target) {
        if (!(await exists(path.join(dist, pathname)))) issues.push(`${route}: link ${href} points at ${pathname}, which is not a built output`);
        continue;
      }
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (fragment && !ids.get(target)?.has(fragment)) issues.push(`${route}: link ${href} has no #${fragment} on ${target}`);
    }
  }
  return issues;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const flag = process.argv.indexOf("--dist");
  const dist = path.resolve(flag > 0 ? process.argv[flag + 1] : path.join(repoRoot, "apps/site/dist"));
  const issues = await checkFragments(dist);
  if (issues.length > 0) {
    console.error(`check-fragments: ${issues.length} problem(s):\n${issues.map((line) => `  - ${line}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`check-fragments ok: every same-site link and structure fragment in ${path.relative(process.cwd(), dist) || dist} resolves.`);
}
