import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFilesystemAssetStore, initializeAuthoringWorkspace } from "zudo-composer/authoring";
import { loadHostContext } from "zudo-composer/vite";
import { readContentEntries } from "./entries";
import { normalizeNoteRoutes } from "./migrate-note-routes";
import { buildPinselSite } from "./structure";
import { prepareNativePublic } from "./prepare-native-public";
import { withAbsentNativeDestinations } from "./native-initialization-preflight";

// Explicit known-data rehearsal only. Normal authoring startup never calls this file.
const workspaceRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const { composerConfig, pack } = await loadHostContext({ workspaceRoot });
const publicRoot = dirname(composerConfig.paths.publicAssets);
const evidencePath = fileURLToPath(new URL("../../.native-import-evidence.json", import.meta.url));
await withAbsentNativeDestinations([composerConfig.paths.data, publicRoot, evidencePath], async () => {
  const project = normalizeNoteRoutes(buildPinselSite(await readContentEntries(), pack).project);
  console.log(`Staging ${project.providers.compositions.flatMap(provider => provider.records).length} compositions and ${project.providers.content.flatMap(provider => provider.entries).length} Content records; legacy D1 is untouched.`);
  await prepareNativePublic(publicRoot);
  const ready = await initializeAuthoringWorkspace({ composerConfig, pack, project, workspaceId: "pinsel" });
  await createFilesystemAssetStore({ assetsStoreRoot: composerConfig.paths.assets });
  await writeFile(evidencePath, `${JSON.stringify({
    source: "committed-content-and-structure", ownerData: false, workspaceId: "pinsel", status: ready.status,
    note: "Staged import; legacy D1 remains untouched. Cross-domain initialization is not atomic.",
  }, null, 2)}\n`, { flag: "wx" });
  console.log("Initialized staged native workspace pinsel from committed inputs. Legacy D1 authority unchanged.");
});
