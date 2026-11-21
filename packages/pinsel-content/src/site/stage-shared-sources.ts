import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { captureAuthoringWorkspace, createFilesystemAssetStore, initializeAuthoringWorkspace, resolveAuthoringPackIdentity, resolveAuthoringRendererIdentity, validateSiteProject, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import { compileAuthoringWorkspaceSnapshot } from "zudo-composer/site-build";
import { loadHostContext } from "zudo-composer/vite";
import { createHash } from "node:crypto";
import { pathContains, resolveSharedSourceDestinations } from "./shared-source-destinations";
import { migrateSharedSources, sharedSourceHash } from "./canonical-shared-sources";
import { checkNativeMigrationSource } from "./check-native-migration-source";
import { nativePublicFiles } from "./prepare-native-public";
import { withAbsentNativeDestinations } from "./native-initialization-preflight";
import { verifyImportedCourseContent } from "./migrate-course-identity";

const [input, expectedDigest, sourceRootArgument, artifactsArgument, ...extra] = process.argv.slice(2).filter(arg => arg !== "--");
if (!input || !expectedDigest || !sourceRootArgument || !artifactsArgument || extra.length || ![input, sourceRootArgument, artifactsArgument].every(isAbsolute)) throw new Error("Usage: stage-shared-sources <absolute-snapshot> <reviewed-digest> <absolute-source-host-root> <new-absolute-artifacts-directory>");
if (process.env.PINSEL_AUTHORING_STAGE !== "notes-v1") throw new Error("Explicit notes-v1 stage required; both source and separate target use that stage");
const { workspaceRoot, sourceRoot, artifacts } = await resolveSharedSourceDestinations(fileURLToPath(new URL("../..", import.meta.url)), sourceRootArgument, artifactsArgument);
const source = JSON.parse(await readFile(input, "utf8")) as AuthoringWorkspaceSnapshot;
const candidate = migrateSharedSources(source, expectedDigest);
if (source.assets.snapshot.records.length || source.assets.snapshot.folders.length || source.assets.files.length || source.assets.lock.pins.length || source.assets.snapshot.mutationToken !== "0".repeat(64) || source.assets.lock.mutationToken !== "0".repeat(64)) throw new Error("Managed Assets or non-pristine Asset history require a supported staged importer; source retained, no destination created");
const original = await loadHostContext({ workspaceRoot: sourceRoot });
const target = await loadHostContext({ workspaceRoot });
if (!await checkNativeMigrationSource(original, source)) throw new Error("Source changed since capture; no staging performed");
const publicRoot = dirname(target.composerConfig.paths.publicAssets);
if (pathContains(target.composerConfig.paths.data, artifacts) || pathContains(publicRoot, artifacts) || pathContains(artifacts, target.composerConfig.paths.data) || pathContains(artifacts, publicRoot)) throw new Error("Evidence must be separate from native data/public roots");
const packIdentity = await resolveAuthoringPackIdentity(target);
const renderer = await resolveAuthoringRendererIdentity(target);
const { manifestDigest: _manifestDigest, ...sourcePackIdentity } = source.componentPack;
if (sharedSourceHash(renderer) !== sharedSourceHash(source.renderer) || sharedSourceHash(packIdentity) !== sharedSourceHash(sourcePackIdentity)) throw new Error("Target installed pack/renderer must match source identities; Mapping-only migration does not upgrade them");
const validation = validateSiteProject(candidate.project, { componentPack: target.pack.manifest });
if (!validation.ok) throw new Error(`Candidate validation failed: ${validation.diagnostics.map(issue => issue.message).join("; ")}`);
const { digest: _sourceDigest, ...candidateBody } = { ...source, project: candidate.project };
await compileAuthoringWorkspaceSnapshot({ snapshot: { ...candidateBody, digest: sharedSourceHash(candidateBody) }, pack: target.pack, packIdentity, renderer });
const files = new Map<string, Buffer>();
for (const file of source.publicFiles) {
  const path = resolve(publicRoot, file.fileName);
  const bytes = Buffer.from(file.base64, "base64");
  if (!path.startsWith(`${publicRoot}${sep}`) || files.has(path) || bytes.length !== file.byteLength || createHash("sha256").update(bytes).digest("hex") !== file.checksum) throw new Error("Invalid captured public bytes; no staging performed");
  files.set(path, bytes);
}
await withAbsentNativeDestinations([target.composerConfig.paths.data, publicRoot, artifacts], async () => {
  // Staged initialization is not atomic. Preserve partial output on failure.
  await mkdir(artifacts);
  await writeFile(join(artifacts, "intent.json"), `${JSON.stringify(candidate.evidence, null, 2)}\n`, { flag: "wx" });
  await mkdir(publicRoot);
  for (const [path, bytes] of files) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { flag: "wx" }); }
  await initializeAuthoringWorkspace({ ...target, project: candidate.project, workspaceId: source.workspaceId });
  await createFilesystemAssetStore({ assetsStoreRoot: target.composerConfig.paths.assets });
  const migrated = await captureAuthoringWorkspace({ ...target, packIdentity, renderer, publicFiles: await nativePublicFiles(workspaceRoot, publicRoot) });
  if (sharedSourceHash(source.assets) !== sharedSourceHash(migrated.assets)) throw new Error("Assets changed during staging; preserve source and target for review");
  const importedContent = verifyImportedCourseContent(candidate.project, migrated.project);
  const expected = structuredClone(candidate.project); expected.providers.content = migrated.project.providers.content;
  if (sharedSourceHash(expected) !== sharedSourceHash(migrated.project)) throw new Error("Unexpected non-Content import changes; preserve staged state for review");
  if (sharedSourceHash(source.publicFiles) !== sharedSourceHash(migrated.publicFiles)) throw new Error("Captured public files changed; preserve staged state for review");
  const compiled = await compileAuthoringWorkspaceSnapshot({ snapshot: migrated, pack: target.pack, packIdentity, renderer });
  const sourceStillCurrent = await checkNativeMigrationSource(original, source);
  await writeFile(join(artifacts, "snapshot.json"), `${JSON.stringify(migrated, null, 2)}\n`, { flag: "wx" });
  await writeFile(join(artifacts, "evidence.json"), `${JSON.stringify({ ...candidate.evidence, importedContent, sourceStillCurrent, targetDigest: migrated.digest, targetTokens: migrated.tokens, targetData: target.composerConfig.paths.data, targetPublic: publicRoot, routes: compiled.build.routes.map(route => route.pathname), authority: "NOT_SWITCHED; original store, history and releases retained. Target starts separate store/history; no history is copied." }, null, 2)}\n`, { flag: "wx" });
  if (!sourceStillCurrent) throw new Error("Source changed during staging. Do not activate; retain both stores and recapture");
  console.log(`Staged canonical shared sources at ${migrated.digest}; authority NOT switched. Review evidence and exact production build before any activation.`);
});
