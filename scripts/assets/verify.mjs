// Checks every approved asset (and every synced/staged copy of it) byte-for-byte
// against tests/fixtures/approved-seed/asset-manifest.json.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { exists, listFiles, paths, repoRoot, sha256File } from "./lib.mjs";

// Accepted R7-10 service illustration; fixed by the approved seed decisions.
export const R7_10_PATH = "prototype/public/assets/illustrations/10-form-through-dialogue.png";
export const R7_10_SHA256 = "9b51ee958846515f0327ceb5406a4a9f84e49ff7000028a634498f7a94f52a22";

// Seed files that are deliberately not shipped (robots.txt is generated later).
export const EXCLUDED = new Set(["prototype/public/assets/fonts/font-provenance.json", "prototype/public/robots.txt"]);

const PUBLIC_PREFIX = "prototype/public/";
const ART_PREFIX = "prototype/src/art/";

/**
 * @typedef {{ path: string, bytes: number, sha256: string }} ManifestEntry
 * @param {ManifestEntry[]} manifest
 */
export function planExpectations(manifest) {
  /** @type {Map<string, ManifestEntry>} */ const publicFiles = new Map();
  /** @type {Map<string, ManifestEntry>} */ const artFiles = new Map();
  const problems = [];
  for (const entry of manifest) {
    if (EXCLUDED.has(entry.path)) continue;
    if (entry.path.startsWith(PUBLIC_PREFIX)) publicFiles.set(entry.path.slice(PUBLIC_PREFIX.length), entry);
    else if (entry.path.startsWith(ART_PREFIX)) artFiles.set(entry.path.slice(ART_PREFIX.length), entry);
    else problems.push(`manifest entry outside the approved asset roots: ${entry.path}`);
  }
  const r710 = manifest.find((entry) => entry.path === R7_10_PATH);
  if (!r710) problems.push(`manifest is missing ${R7_10_PATH}`);
  else if (r710.sha256 !== R7_10_SHA256) problems.push(`manifest R7-10 sha256 is ${r710.sha256}, expected ${R7_10_SHA256}`);
  return { publicFiles, artFiles, problems };
}

/**
 * @param {string} root
 * @param {Map<string, ManifestEntry>} expected
 * @param {{ exact: boolean }} options exact = no files beyond `expected`
 */
async function checkTree(root, expected, { exact }) {
  const label = path.relative(repoRoot, root);
  const problems = [];
  const present = new Set(await listFiles(root));
  for (const [rel, entry] of expected) {
    if (!present.has(rel)) {
      problems.push(`${label}: missing ${rel}`);
      continue;
    }
    const file = path.join(root, rel);
    const sha256 = await sha256File(file);
    if (sha256 !== entry.sha256) problems.push(`${label}: ${rel} sha256 ${sha256} != approved ${entry.sha256}`);
  }
  if (exact) {
    for (const rel of present) if (!expected.has(rel)) problems.push(`${label}: unexpected file ${rel}`);
  }
  return { problems, checked: expected.size };
}

export async function verify() {
  /** @type {ManifestEntry[]} */
  const manifest = JSON.parse(await readFile(paths.approvedManifest, "utf8"));
  const { publicFiles, artFiles, problems } = planExpectations(manifest);
  const report = [];

  const trees = [
    { root: paths.uiPublic, expected: publicFiles, exact: true, required: true },
    { root: paths.uiArt, expected: artFiles, exact: true, required: true },
    { root: paths.sitePublic, expected: publicFiles, exact: true, required: false },
    // The worker bundle also carries editor output and its own manifest.
    { root: paths.workerAssets, expected: publicFiles, exact: false, required: false },
  ];
  for (const tree of trees) {
    // An empty optional tree is a placeholder (the worker vitest config creates
    // dist-assets so its assets binding can start), not a stale staging copy.
    if (!(await exists(tree.root)) || (!tree.required && (await readdir(tree.root)).length === 0)) {
      if (tree.required) problems.push(`missing ${path.relative(repoRoot, tree.root)}`);
      continue;
    }
    const result = await checkTree(tree.root, tree.expected, { exact: tree.exact });
    problems.push(...result.problems);
    report.push(`${path.relative(repoRoot, tree.root)}: ${result.checked} files`);
  }
  return { problems, report };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { problems, report } = await verify();
  for (const line of report) console.log(`assets:verify ${line}`);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`assets:verify FAIL ${problem}`);
    process.exit(1);
  }
  console.log(`assets:verify ok (R7-10 sha256 ${R7_10_SHA256})`);
}
