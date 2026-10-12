// Shared loaders for the publication CI scripts. The snapshot record format and
// the identity report live in the Worker (apps/authoring-worker/src/publish/
// publication-record.ts) and the publish allowlist in @pinsel/content; CI loads
// the same TypeScript through tsx so the two sides cannot drift.
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { tsImport } from "tsx/esm/api";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @param {string} relative */
const load = (relative) => tsImport(pathToFileURL(path.join(repoRoot, relative)).href, import.meta.url);

/** @returns {Promise<typeof import("../../apps/authoring-worker/src/publish/publication-record")>} */
export const loadPublicationRecord = () => load("apps/authoring-worker/src/publish/publication-record.ts");

/** @returns {Promise<typeof import("../../packages/pinsel-content/src/import-rules")>} */
export const loadImportRules = () => load("packages/pinsel-content/src/import-rules.ts");

/**
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export async function git(...args) {
  const { stdout } = await promisify(execFile)("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

/** @param {string} flag */
export function argument(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
