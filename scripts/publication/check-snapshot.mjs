// Publication CI gate for one content snapshot (the `content-validate`
// workflow and the `publication-validate` job of ci.yml). Subcommands:
//
//   paths  --base <sha> --head <sha>   the PR's changed paths ⊆ the publish allowlist, snapshot record included
//   record [--head <sha>] [--any-identity]
//                                      content/snapshot.json is a valid record for this repository's package
//                                      identity; with --head, that commit's only parent is the recorded base.
//                                      --any-identity (pushes to main): the record of an earlier publication
//                                      may name older pins than the current tree.
//   digest                             the assembled project (pnpm content:assemble) hashes to the snapshot id
//   report --head <sha> --out <file>   write the identity report the GitHub provider requires (check run summary)
//
// The historical strict checker (scripts/check-content.sh) is never run here:
// it belongs to the migration-baseline job only (docs/publication.md).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { argument, git, loadImportRules, loadPublicationRecord, repoRoot } from "./lib.mjs";

const SNAPSHOT_PATH = "content/snapshot.json";

/**
 * @param {readonly string[]} changed
 * @param {(path: string) => boolean} isPublishablePath
 * @returns {string[]}
 */
export function changedPathProblems(changed, isPublishablePath) {
  const problems = changed.filter((file) => !isPublishablePath(file)).map((file) => `${file} is outside the publish allowlist (content/entries/**, content/snapshot.json)`);
  if (!changed.includes(SNAPSHOT_PATH)) problems.push(`${SNAPSHOT_PATH} is not part of the change`);
  return problems;
}

/**
 * @param {import("../../apps/authoring-worker/src/publish/publication-record").SnapshotRecordFile | null} record
 * @param {import("../../apps/authoring-worker/src/publish/publication-record").PublicationPackageIdentity | null} expected null: any identity
 * @returns {string[]}
 */
export function recordProblems(record, expected) {
  if (!record) return [`${SNAPSHOT_PATH} is not a valid snapshot record`];
  /** @type {string[]} */
  const problems = [];
  if (record.contentDigest !== record.snapshotId) problems.push(`contentDigest ${record.contentDigest} differs from snapshotId ${record.snapshotId}`);
  for (const key of /** @type {const} */ (["zfb", "composerSha", "contractSha"])) {
    if (expected && record.packageIdentity[key] !== expected[key]) problems.push(`packageIdentity.${key} is ${record.packageIdentity[key]}, this repository builds with ${expected[key]}`);
  }
  return problems;
}

/** The identity this checkout builds with: Worker pins, and the site's zfb must agree. */
async function repositoryIdentity() {
  const { packageIdentityFromManifest } = await loadPublicationRecord();
  const read = async (/** @type {string} */ file) => JSON.parse(await readFile(path.join(repoRoot, file), "utf8"));
  const identity = packageIdentityFromManifest(await read("apps/authoring-worker/package.json"));
  const siteZfb = (await read("apps/site/package.json")).dependencies?.["@takazudo/zfb"];
  if (siteZfb !== identity.zfb) throw new Error(`apps/site builds with @takazudo/zfb ${siteZfb}, the authoring Worker declares ${identity.zfb}`);
  return identity;
}

async function readRecord() {
  const { parseSnapshotRecord } = await loadPublicationRecord();
  return parseSnapshotRecord(await readFile(path.join(repoRoot, SNAPSHOT_PATH), "utf8"));
}

/** @param {string} label @param {string[]} problems */
function finish(label, problems) {
  if (problems.length > 0) {
    console.error(`check-snapshot ${label}: ${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    process.exit(1);
  }
}

/** @param {string} flag */
function required(flag) {
  const value = argument(flag);
  if (!value) throw new Error(`${flag} is required`);
  return value;
}

async function main() {
  const command = process.argv[2];
  if (command === "paths") {
    const base = required("--base");
    const head = required("--head");
    const changed = (await git("diff", "--name-only", "--no-renames", `${base}...${head}`)).split("\n").filter(Boolean);
    const { isPublishablePath } = await loadImportRules();
    finish("paths", changedPathProblems(changed, isPublishablePath));
    console.log(`check-snapshot paths ok: ${changed.length} changed path(s), all inside the publish allowlist`);
  } else if (command === "record") {
    const record = await readRecord();
    const problems = recordProblems(record, process.argv.includes("--any-identity") ? null : await repositoryIdentity());
    const head = argument("--head");
    if (record && head) {
      const [, ...parents] = (await git("rev-list", "--parents", "-n", "1", head)).split(" ");
      if (parents.length !== 1 || parents[0] !== record.baselineGitSha) problems.push(`${head} must be one commit on top of the recorded base ${record.baselineGitSha} (parents: ${parents.join(", ") || "none"})`);
    }
    finish("record", problems);
    console.log(`check-snapshot record ok: snapshot ${record?.snapshotId} on base ${record?.baselineGitSha}`);
  } else if (command === "digest") {
    const record = await readRecord();
    const assembled = JSON.parse(await readFile(path.join(repoRoot, "packages/pinsel-content/.site-project/baseline.json"), "utf8"));
    const problems = !record ? [`${SNAPSHOT_PATH} is not a valid snapshot record`] : assembled.projectDigest === record.snapshotId ? [] : [`the assembled project hashes to ${assembled.projectDigest}, the snapshot record says ${record.snapshotId}: the committed entries are not that snapshot`];
    finish("digest", problems);
    console.log(`check-snapshot digest ok: content/entries assemble to snapshot ${record?.snapshotId}`);
  } else if (command === "report") {
    const head = required("--head");
    const out = required("--out");
    const record = await readRecord();
    if (!record) return finish("report", [`${SNAPSHOT_PATH} is not a valid snapshot record`]);
    const { formatIdentityReport } = await loadPublicationRecord();
    const resolved = await git("rev-parse", head);
    await writeFile(out, `${formatIdentityReport({ snapshotId: record.snapshotId, contentDigest: record.contentDigest, headSha: resolved, packageIdentity: await repositoryIdentity() })}\n`);
    console.log(`check-snapshot report written to ${out}`);
  } else {
    throw new Error("usage: check-snapshot.mjs paths|record|digest|report [options]");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
