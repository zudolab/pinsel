// The public build ships none of the repository-only material listed in
// CLAUDE.md "Public-output exclusions", nor any publication or authoring record.
// Usage: node scripts/publication/check-public-output.mjs [--dist apps/site/dist]
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { argument, repoRoot } from "./lib.mjs";

/** @type {[RegExp, string][]} */
const FORBIDDEN_PATHS = [
  [/(^|\/)font-provenance\.json$/, "font provenance"],
  [/(^|\/)provenance\//, "seed provenance"],
  [/(^|\/)tests?\/fixtures\//, "test fixtures"],
  [/(^|\/)(content|expected-content|page-manifest)\.json$/, "seed content / manifest"],
  [/(^|\/)check-content\.py$/, "the historical checker"],
  [/(^|\/)source-content\//, "source content"],
  [/(^|\/)__zfb\/routes\.json$/, "zfb route manifest"],
  [/(^|\/)(snapshot|baseline)\.json$/, "a content/publication record"],
  [/(^|\/)content\/entries\//, "raw content entries"],
  [/(^|\/)\.site-project\//, "the assembled site project"],
];

/** @type {[RegExp, string][]} */
const FORBIDDEN_TEXT = [
  [/pinsel-fake-publication-provider|pinsel-local-dev-identity-fixture/, "an authoring Worker test fixture"],
  [/cf-access-jwt-assertion/, "authoring identity plumbing"],
  [/pinsel-publication-identity/, "a publication identity report"],
];

/**
 * @param {readonly { path: string, text?: string }[]} files
 * @returns {string[]}
 */
export function publicOutputProblems(files) {
  /** @type {string[]} */
  const problems = [];
  for (const file of files) {
    for (const [pattern, label] of FORBIDDEN_PATHS) if (pattern.test(file.path)) problems.push(`${file.path} is ${label}`);
    if (file.text !== undefined) for (const [pattern, label] of FORBIDDEN_TEXT) if (pattern.test(file.text)) problems.push(`${file.path} contains ${label}`);
  }
  return problems;
}

async function main() {
  const dist = path.resolve(argument("--dist") ?? path.join(repoRoot, "apps/site/dist"));
  const entries = await readdir(dist, { recursive: true, withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const full = path.join(entry.parentPath, entry.name);
        const relative = path.relative(dist, full).split(path.sep).join("/");
        return { path: relative, ...(/\.(html|css|js|json|txt|xml|webmanifest)$/.test(entry.name) ? { text: await readFile(full, "utf8") } : {}) };
      }),
  );
  if (files.length === 0) {
    console.error(`check-public-output: ${dist} is empty; build the site first`);
    process.exit(1);
  }
  const problems = publicOutputProblems(files);
  if (problems.length > 0) {
    console.error(`check-public-output: ${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`check-public-output ok: ${files.length} files in ${path.relative(repoRoot, dist) || "."}, no repository-only material`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
