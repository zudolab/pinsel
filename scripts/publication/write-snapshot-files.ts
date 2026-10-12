// Writes into the working tree exactly the files the Git publisher would
// commit for one authoring snapshot (`content/entries/**` that differ from the
// baseline + `content/snapshot.json`), through the Worker's own
// planPublication/serializeEntryFile. For a local dry run of the
// content-validate steps: commit the result on top of the snapshot's baseline
// commit, then run the workflow's commands (docs/verification/cms.md).
//
// Usage: pnpm exec tsx scripts/publication/write-snapshot-files.ts <snapshot.json> [--requested-by <email>]
// <snapshot.json> is a `GET /api/v1/snapshots/:id` value. The assembled
// baseline (pnpm content:assemble) must be the snapshot's baseline.
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentSnapshotRecord } from "zudo-composer/host-storage";
import type { SiteProject } from "zudo-composer/site-project";
import { serializeSnapshotRecord } from "../../apps/authoring-worker/src/publish/publication-record";
import { planPublication, publicationPackageIdentity, serializeEntryFile } from "../../apps/authoring-worker/src/publish/snapshot-files";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const snapshotFile = argv[0];
if (!snapshotFile) throw new Error("usage: write-snapshot-files.ts <snapshot.json> [--requested-by <email>]");
const requestedBy = argv.includes("--requested-by") ? argv[argv.indexOf("--requested-by") + 1]! : "local-dev@example.test";

const snapshot = JSON.parse(await readFile(path.resolve(snapshotFile), "utf8")) as ContentSnapshotRecord;
const assembled = path.join(repoRoot, "packages/pinsel-content/.site-project");
const baseline = JSON.parse(await readFile(path.join(assembled, "baseline.json"), "utf8")) as { baselineRevision: string };
if (baseline.baselineRevision !== snapshot.baselineRevision) throw new Error(`The assembled baseline is ${baseline.baselineRevision}, the snapshot was taken on ${snapshot.baselineRevision}: check out and assemble that commit first.`);
const baselineProject = JSON.parse(await readFile(path.join(assembled, "site-project.json"), "utf8")) as SiteProject;

const plan = planPublication({ snapshot, baselineProject, packageIdentity: publicationPackageIdentity(), requestedBy, requestedAt: snapshot.createdAt });
for (const write of plan.writes) {
  const file = path.join(repoRoot, write.path);
  const previous = write.existed ? JSON.parse(await readFile(file, "utf8")) : undefined;
  await writeFile(file, serializeEntryFile(write.entry, snapshot.project, previous));
}
for (const deleted of plan.deletes) await rm(path.join(repoRoot, deleted));
await writeFile(path.join(repoRoot, "content/snapshot.json"), serializeSnapshotRecord(plan.record));
console.log(`write-snapshot-files: ${plan.writes.length} entr${plan.writes.length === 1 ? "y" : "ies"} written (${plan.writes.map((write) => write.path).join(", ")}), ${plan.deletes.length} removed, content/snapshot.json for ${plan.record.snapshotId} on ${plan.record.baselineGitSha}`);
