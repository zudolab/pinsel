import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  captureAuthoringWorkspace, createFilesystemAssetStore, initializeAuthoringWorkspace,
  resolveAuthoringPackIdentity, resolveAuthoringRendererIdentity,
  validateSiteProject, type AuthoringWorkspaceSnapshot,
} from "zudo-composer/authoring";
import { compileAuthoringWorkspaceSnapshot } from "zudo-composer/site-build";
import { loadHostContext } from "zudo-composer/vite";
import { verifyImportedCourseContent } from "./migrate-course-identity";
import { checkNativeMigrationSource } from "./check-native-migration-source";
import { migrateNoteRoutes } from "./migrate-note-routes";
import { nativePublicFiles, prepareNativeScripts } from "./prepare-native-public";

const args = process.argv.slice(2).filter(arg => arg !== "--");
const rootOption = args.indexOf("--source-root");
const explicitSourceRoot = rootOption >= 0 ? args.splice(rootOption, 2)[1] : undefined;
if (rootOption >= 0 && !explicitSourceRoot) throw new Error("--source-root needs an existing source host root");
const [input, expectedDigest, ...extra] = args;
if (!input || !expectedDigest || extra.length) throw new Error("Usage: authoring:migrate-notes -- <source-snapshot.json> <reviewed-source-digest> [--source-root <host-root>]");
if (process.env.PINSEL_AUTHORING_STAGE) throw new Error("Run migration from the default source authority, without PINSEL_AUTHORING_STAGE");
const source = JSON.parse(await readFile(resolve(input), "utf8")) as AuthoringWorkspaceSnapshot;
const candidate = migrateNoteRoutes(source, expectedDigest);
// This migration does not pretend an empty initialized asset store preserves
// managed Assets. The supplied rehearsal has none; nonempty stores need a
// separately implemented public asset import before this migration can proceed.
if (source.assets.snapshot.records.length || source.assets.snapshot.folders.length || source.assets.files.length || source.assets.lock.pins.length) throw new Error("Managed Assets require a supported staged import; source retained, no destination created.");
const workspaceRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const sourceRoot = explicitSourceRoot ? resolve(explicitSourceRoot) : workspaceRoot;
process.env.PINSEL_AUTHORING_STAGE = "course-identity-v1";
const original = await loadHostContext({ workspaceRoot: sourceRoot });
if (!await checkNativeMigrationSource(original, source)) throw new Error("Source changed since capture; save/stop and capture again. No migration performed.");
process.env.PINSEL_AUTHORING_STAGE = "notes-v1";
const target = await loadHostContext({ workspaceRoot });
const publicRoot = dirname(target.composerConfig.paths.publicAssets);
const evidencePath = join(workspaceRoot, ".native-note-routes-evidence.json");
const snapshotPath = join(workspaceRoot, ".native-note-routes-snapshot.json");
for (const destination of [target.composerConfig.paths.data, publicRoot, evidencePath, snapshotPath]) {
  try {
    await lstat(destination);
    throw new Error(`Migration destination exists; preserve it and review recovery: ${destination}`);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
if (target.composerConfig.paths.data === original.composerConfig.paths.data) throw new Error("Staging authority did not resolve separately; refusing migration");
const packIdentity = await resolveAuthoringPackIdentity(target);
const renderer = await resolveAuthoringRendererIdentity(target);
if (target.pack.manifest.packVersion !== "0.4.0" || renderer.version !== "native-v3") throw new Error("Target pack/renderer do not match the reviewed migration");
const validation = validateSiteProject(candidate.project, { componentPack: target.pack.manifest });
if (!validation.ok) throw new Error(`Candidate validation failed: ${validation.diagnostics.map(issue => issue.message).join("; ")}`);
const publicNames = new Set<string>();
for (const file of source.publicFiles) {
  const path = resolve(publicRoot, file.fileName);
  const bytes = Buffer.from(file.base64, "base64");
  if (!path.startsWith(`${publicRoot}${sep}`) || publicNames.has(path) || file.byteLength !== bytes.length || createHash("sha256").update(bytes).digest("hex") !== file.checksum) throw new Error("Invalid captured public file; no destination created");
  publicNames.add(path);
}
// All candidate checks above precede destination creation. Initialization is
// staged across stores, not atomic; failures retain partial staging for review.
await mkdir(publicRoot);
for (const file of source.publicFiles) {
  const path = resolve(publicRoot, file.fileName);
  const bytes = Buffer.from(file.base64, "base64");
  if (!path.startsWith(`${publicRoot}${sep}`) || file.byteLength !== bytes.length || createHash("sha256").update(bytes).digest("hex") !== file.checksum) throw new Error("Invalid captured public file; source unchanged");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: "wx" });
}
await prepareNativeScripts(publicRoot);
await initializeAuthoringWorkspace({ ...target, project: candidate.project, workspaceId: source.workspaceId });
await createFilesystemAssetStore({ assetsStoreRoot: target.composerConfig.paths.assets });
const captureOptions = { ...target, packIdentity, renderer, publicFiles: await nativePublicFiles(workspaceRoot, publicRoot) };
const migrated = await captureAuthoringWorkspace(captureOptions);
const importedContent = verifyImportedCourseContent(source.project, migrated.project);
const compiled = await compileAuthoringWorkspaceSnapshot({ snapshot: migrated, pack: target.pack, packIdentity, renderer });
const sourceStillCurrent = await checkNativeMigrationSource(original, source);
const hashesBefore = new Map(source.publicFiles.map(file => [file.fileName, file.checksum]));
const hashesAfter = new Map(migrated.publicFiles.map(file => [file.fileName, file.checksum]));
const publicChanges = [...new Set([...hashesBefore.keys(), ...hashesAfter.keys()])].filter(name => hashesBefore.get(name) !== hashesAfter.get(name)).map(fileName => ({ fileName, before: hashesBefore.get(fileName), after: hashesAfter.get(fileName) }));
const evidence = { ...candidate.evidence, importedContent, sourceStillCurrent, targetCapture: migrated.digest, actualTargetPack: migrated.componentPack, actualTargetRenderer: migrated.renderer,
  targetData: target.composerConfig.paths.data, targetPublic: publicRoot, publicChanges, routes: compiled.build.routes.map(route => route.pathname),
  activation: "NOT_SWITCHED. Start this known-data rehearsal explicitly with PINSEL_AUTHORING_STAGE=notes-v1 pnpm dev. Original store/history and legacy D1 remain unchanged.",
};
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
// Capture/evidence live outside public shipping bytes and are never served.
await writeFile(snapshotPath, `${JSON.stringify(migrated, null, 2)}\n`, { flag: "wx" });
if (!sourceStillCurrent) throw new Error("Source changed during staging. Do not activate candidate; preserve both stores and recapture.");
console.log(`Staged ${compiled.build.routes.length} routes at ${migrated.digest}. Source unchanged; authority NOT switched.`);
