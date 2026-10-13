// Public-output boundaries: apps/site/dist holds only the allowlisted entries,
// carries no editor / styleguide / Composer chrome, and every page's only
// scripts are the three visitor client entries; every same-site link and
// fragment resolves (scripts/site/check-fragments.mjs). The editor bundle
// carries no zudo-react; the Worker's production bundle is checked by
// scripts/check-worker-bundle.mjs.
// Usage: node scripts/check-boundaries.mjs
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkFragments } from "./site/check-fragments.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} dir @param {(name: string) => boolean} filter */
async function files(dir, filter) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && filter(entry.name)).map((entry) => path.join(entry.parentPath, entry.name)).sort();
}

/** @type {string[]} */
const failures = [];

const siteDist = path.join(repoRoot, "apps/site/dist");
const VISITOR_SCRIPTS = ["art-clock", "motion", "site"];
const CLIENT_SCRIPT = new RegExp(`^(${VISITOR_SCRIPTS.join("|")})-[0-9a-f]{8}\\.js$`);
// Top-level dist entries and assets/ entries: the 14 outputs, robots/sitemap, and the synced public assets.
const TOP_LEVEL = ["404.html", "about", "assets", "contact", "faq", "favicon.svg", "index.html", "lessons", "notes", "results", "robots.txt", "sitemap.xml", "voices"];
const ASSET_ENTRIES = [/^client$/, /^fonts$/, /^illustrations$/, /^instructor-yuko\.jpg$/, /^styles-[0-9a-f]{8}\.css$/];
const FORBIDDEN_NAMES = /font-provenance|provenance|content\.json$|expected-content\.json$|check-content\.py$|page-manifest\.json$|source-content|routes\.json$/;

const topLevel = (await readdir(siteDist).catch(() => [])).sort();
for (const name of topLevel) if (!TOP_LEVEL.includes(name)) failures.push(`apps/site/dist/${name} is not an allowlisted public entry`);
for (const name of TOP_LEVEL) if (topLevel.length > 0 && !topLevel.includes(name)) failures.push(`apps/site/dist/${name} is missing`);
for (const name of await readdir(path.join(siteDist, "assets")).catch(() => [])) {
  if (!ASSET_ENTRIES.some((pattern) => pattern.test(name))) failures.push(`apps/site/dist/assets/${name} is not an allowlisted asset entry`);
}
const clientScripts = (await readdir(path.join(siteDist, "assets/client")).catch(() => [])).sort();
if (clientScripts.length !== VISITOR_SCRIPTS.length || !clientScripts.every((name) => CLIENT_SCRIPT.test(name))) failures.push(`apps/site/dist/assets/client must hold exactly the three visitor entries, found ${JSON.stringify(clientScripts)}`);
for (const file of await files(siteDist, () => true)) {
  if (FORBIDDEN_NAMES.test(path.relative(siteDist, file))) failures.push(`${path.relative(repoRoot, file)} must not ship`);
}

const siteFiles = await files(siteDist, (name) => /\.(html|css|js|json|xml|txt)$/.test(name));
if (siteFiles.length === 0) failures.push("apps/site/dist is empty; run pnpm build:site");
for (const file of siteFiles) {
  const text = await readFile(file, "utf8");
  const rel = path.relative(repoRoot, file);
  /** @type {[RegExp, string][]} */
  const forbidden = [[/zudo-composer/, "Composer"], [/_zudo-sg|sg-hosted|sg-content/, "styleguide chrome"], [/preact/i, "Preact"], [/site-project/, "site-project data"], [/font-provenance|provenance\//, "provenance"], [/data-zfb-island/, "an island"], [/postMessage|pinsel-r5-motion|\.get\(["'](motion|art-phase|state)["']\)/, "review-only plumbing"]];
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) failures.push(`${rel} contains ${label}`);
  }
  if (file.endsWith(".html")) {
    const scripts = text.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
    const expected = VISITOR_SCRIPTS.map((name) => new RegExp(`^<script type="module" src="/assets/client/${name}-[0-9a-f]{8}\\.js"></script>$`));
    if (scripts.length !== expected.length || !scripts.every((tag, index) => expected[index]?.test(tag))) failures.push(`${rel} must carry exactly the three visitor scripts in load order, found ${JSON.stringify(scripts)}`);
  } else if (/<script/i.test(text)) failures.push(`${rel} contains a <script> tag`);
}
if (siteFiles.some((file) => file.includes("__zfb"))) failures.push("apps/site/dist ships __zfb/routes.json");
if (topLevel.length > 0) failures.push(...(await checkFragments(siteDist)).map((issue) => `fragments: ${issue}`));

const editorScripts = await files(path.join(repoRoot, "apps/editor/dist"), (name) => name.endsWith(".js"));
if (editorScripts.length === 0) failures.push("apps/editor/dist has no scripts; run pnpm build:editor");
const editorCode = (await Promise.all(editorScripts.map((file) => readFile(file, "utf8")))).join("\n");
/** @type {[RegExp, string][]} */
const editorForbidden = [[/zudo-react/, "zudo-react"], [/zudo-react\.description/, "zudo-react descriptions"], [/__vite-browser-external/, "a Node builtin stub"], [/["']node:[a-z]/, "a node: import"], [/zudo-composer\/src\//, "a private Composer source path"]];
for (const [pattern, label] of editorForbidden) {
  if (pattern.test(editorCode)) failures.push(`editor bundle contains ${label}`);
}
if (!/保存しました/.test(editorCode)) failures.push("editor bundle lacks the Japanese labels");
if (!/mountContentEditor|sg-hosted-content-editor/.test(editorCode + (await Promise.all((await files(path.join(repoRoot, "apps/editor/dist"), (name) => name.endsWith(".css"))).map((file) => readFile(file, "utf8")))).join(""))) failures.push("editor bundle lacks the Composer editor chrome");

if (failures.length > 0) {
  console.error(`check-boundaries failed:\n${failures.map((line) => `  - ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`check-boundaries: public dist (${siteFiles.length} files) holds only allowlisted entries, the three visitor scripts and resolving links, with no editor/SG/Composer chrome; editor bundle (${editorScripts.length} files) has no zudo-react.`);
