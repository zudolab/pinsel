// Gate-1 boundaries: the public site output carries no editor / styleguide /
// Composer chrome and no scripts; the editor bundle carries no zudo-react; the
// Worker's production bundle is checked by scripts/check-worker-bundle.mjs.
// Usage: node scripts/check-boundaries.mjs
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} dir @param {(name: string) => boolean} filter */
async function files(dir, filter) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && filter(entry.name)).map((entry) => path.join(entry.parentPath, entry.name)).sort();
}

/** @type {string[]} */
const failures = [];

const siteDist = path.join(repoRoot, "apps/site/dist");
const siteFiles = await files(siteDist, (name) => /\.(html|css|js|json)$/.test(name));
if (siteFiles.length === 0) failures.push("apps/site/dist is empty; run pnpm build:site");
for (const file of siteFiles) {
  const text = await readFile(file, "utf8");
  const rel = path.relative(repoRoot, file);
  /** @type {[RegExp, string][]} */
  const forbidden = [[/zudo-composer/, "Composer"], [/_zudo-sg|sg-hosted|sg-content/, "styleguide chrome"], [/preact/i, "Preact"], [/site-project/, "site-project data"], [/font-provenance|provenance\//, "provenance"], [/data-zfb-island|<script/i, "scripts"]];
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) failures.push(`${rel} contains ${label}`);
  }
}
if (siteFiles.some((file) => file.includes("__zfb"))) failures.push("apps/site/dist ships __zfb/routes.json");

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
console.log(`check-boundaries: public dist (${siteFiles.length} files) has no scripts/editor/SG/Composer chrome; editor bundle (${editorScripts.length} files) has no zudo-react.`);
