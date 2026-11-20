import { realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const pathContains = (parent: string, child: string) => {
  const path = relative(parent, child);
  return !path || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
};
/** Read-only preflight. Evidence parent must exist; resolve aliases before checking boundaries. */
export async function resolveSharedSourceDestinations(target: string, source: string, evidence: string) {
  const workspaceRoot = await realpath(target);
  const sourceRoot = await realpath(source);
  const artifacts = join(await realpath(dirname(resolve(evidence))), basename(evidence));
  if (pathContains(workspaceRoot, sourceRoot) || pathContains(sourceRoot, workspaceRoot) || pathContains(sourceRoot, artifacts)) throw new Error("Source and target host roots must be disjoint; evidence must not be inside the source host");
  return { workspaceRoot, sourceRoot, artifacts };
}
