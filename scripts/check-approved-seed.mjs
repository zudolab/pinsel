// Fails when any file under tests/fixtures/approved-seed/ is added, removed or
// changed relative to the committed sha256 manifest. `--seed <dir>` also
// cross-checks every seed-derived fixture against an extracted seed package.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { exists, listFiles, repoRoot, sha256File } from "./assets/lib.mjs";

export const FIXTURE_ROOT = "tests/fixtures/approved-seed";
export const MANIFEST_PATH = "tests/approved-seed.sha256.json";
// Second lock: rewriting the manifest to match an edited fixture must also change this line.
export const MANIFEST_SHA256 = "eecacda905fc9b3197b6225aad832494ddbfd0defe5bbd09b52a30bc23b2987e";

/**
 * @typedef {{ path: string, seedPath: string | null, bytes: number, sha256: string }} SeedEntry
 * @typedef {{ bytes: number, sha256: string }} FileDigest
 * @param {SeedEntry[]} expected
 * @param {Map<string, FileDigest>} actual relative path -> digest of the files on disk
 */
export function compareFixtures(expected, actual) {
  const problems = [];
  const listed = new Set();
  for (const entry of expected) {
    if (listed.has(entry.path)) problems.push(`duplicate manifest entry ${entry.path}`);
    listed.add(entry.path);
    const file = actual.get(entry.path);
    if (!file) problems.push(`removed ${entry.path}`);
    else if (file.sha256 !== entry.sha256 || file.bytes !== entry.bytes) {
      problems.push(`changed ${entry.path}: sha256 ${file.sha256} (${file.bytes} B) != approved ${entry.sha256} (${entry.bytes} B)`);
    }
  }
  for (const rel of actual.keys()) if (!listed.has(rel)) problems.push(`added ${rel}`);
  return problems;
}

/** @param {string} root */
async function digestTree(root) {
  /** @type {Map<string, FileDigest>} */ const out = new Map();
  for (const rel of await listFiles(root)) {
    const buffer = await readFile(path.join(root, rel));
    out.set(rel, { bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") });
  }
  return out;
}

/** @param {{ seedDir?: string }} [options] */
export async function checkApprovedSeed({ seedDir } = {}) {
  const manifestFile = path.join(repoRoot, MANIFEST_PATH);
  const problems = [];
  const manifestSha256 = await sha256File(manifestFile);
  if (manifestSha256 !== MANIFEST_SHA256) problems.push(`${MANIFEST_PATH} sha256 ${manifestSha256} != pinned ${MANIFEST_SHA256}`);
  /** @type {{ root: string, files: SeedEntry[] }} */
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  if (manifest.root !== FIXTURE_ROOT) problems.push(`${MANIFEST_PATH} root is ${manifest.root}, expected ${FIXTURE_ROOT}`);
  problems.push(...compareFixtures(manifest.files, await digestTree(path.join(repoRoot, FIXTURE_ROOT))));

  let seedChecked = 0;
  if (seedDir) {
    for (const entry of manifest.files) {
      if (entry.seedPath === null) continue;
      const file = path.join(seedDir, entry.seedPath);
      if (!(await exists(file))) problems.push(`seed package: missing ${entry.seedPath}`);
      else if ((await sha256File(file)) !== entry.sha256) problems.push(`seed package: ${entry.seedPath} differs from ${entry.path}`);
      seedChecked += 1;
    }
  }
  return { problems, checked: manifest.files.length, seedChecked };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const seedFlag = process.argv.indexOf("--seed");
  const seedDir = seedFlag === -1 ? undefined : process.argv[seedFlag + 1];
  if (seedFlag !== -1 && !seedDir) {
    console.error("usage: node scripts/check-approved-seed.mjs [--seed <extracted seed package dir>]");
    process.exit(2);
  }
  const { problems, checked, seedChecked } = await checkApprovedSeed({ seedDir });
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check:approved-seed FAIL ${problem}`);
    process.exit(1);
  }
  const seedNote = seedDir ? `, ${seedChecked} matched the seed package` : "";
  console.log(`check:approved-seed ok (${checked} files${seedNote}; manifest sha256 ${MANIFEST_SHA256})`);
}
