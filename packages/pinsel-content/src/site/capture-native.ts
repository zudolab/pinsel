import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { captureAuthoringWorkspace, resolveAuthoringPackIdentity, resolveAuthoringRendererIdentity } from "zudo-composer/authoring";
import { loadHostContext } from "zudo-composer/vite";
import { nativePublicFiles } from "./prepare-native-public";

const file = process.argv.slice(2).find(value => value !== "--");
if (!file) throw new Error("Usage: authoring:capture -- <new-snapshot.json>; save and stop the editor first");
const host = await loadHostContext({ workspaceRoot: resolve(fileURLToPath(new URL("../..", import.meta.url))) });
const snapshot = await captureAuthoringWorkspace({
  ...host, packIdentity: await resolveAuthoringPackIdentity(host), renderer: await resolveAuthoringRendererIdentity({ composerConfig: host.composerConfig }),
  publicFiles: await nativePublicFiles(host.workspaceRoot, dirname(host.composerConfig.paths.publicAssets)),
});
await writeFile(resolve(file), `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
console.log(`Captured native workspace ${snapshot.workspaceId} at ${snapshot.digest}. No draft writes.`);
