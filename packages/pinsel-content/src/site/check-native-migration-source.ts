import { dirname } from "node:path";
import { isAuthoringWorkspaceSourceCurrent, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import { nativePublicFiles } from "./prepare-native-public";

/** Re-enumerate the source on every check, including after staged import. */
export async function checkNativeMigrationSource(
  host: Parameters<typeof isAuthoringWorkspaceSourceCurrent>[0],
  snapshot: AuthoringWorkspaceSnapshot,
): Promise<boolean> {
  const root = dirname(host.composerConfig.paths.publicAssets);
  const workspaceRoot = host.composerConfig.workspaceRoot;
  const publicFiles = await nativePublicFiles(workspaceRoot, root);
  if (!await isAuthoringWorkspaceSourceCurrent({ ...host, publicFiles }, snapshot)) return false;
  // The public API verifies the supplied files. A file added while that check
  // runs must not disappear merely because it was absent from the first list.
  return JSON.stringify(await nativePublicFiles(workspaceRoot, root)) === JSON.stringify(publicFiles);
}
