import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const pathContains = (parent: string, child: string) => {
  const path = relative(parent, child);
  return !path || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
};

const git = (cwd: string, args: readonly string[]) => new Promise<number>(done => {
  execFile("git", ["-C", cwd, ...args], error => done(error ? typeof error.code === "number" ? error.code : -1 : 0));
});

/** Evidence holds full Content and base64 public bytes, so it must never be committable by accident. */
export async function assertUncommittableEvidence(artifacts: string) {
  const parent = dirname(artifacts);
  if (await git(parent, ["rev-parse", "--is-inside-work-tree"]) !== 0) return;
  if (await git(parent, ["check-ignore", "-q", "--", artifacts]) !== 0) {
    throw new Error(`Evidence directory is inside a Git work tree and not ignored; choose a location outside the repository or an ignored path: ${artifacts}`);
  }
}

/** Read-only preflight. Evidence parent must exist; resolve aliases before checking boundaries. */
export async function resolveSharedSourceDestinations(target: string, source: string, evidence: string) {
  const workspaceRoot = await realpath(target);
  const sourceRoot = await realpath(source);
  const artifacts = join(await realpath(dirname(resolve(evidence))), basename(evidence));
  if (pathContains(workspaceRoot, sourceRoot) || pathContains(sourceRoot, workspaceRoot) || pathContains(sourceRoot, artifacts)) throw new Error("Source and target host roots must be disjoint; evidence must not be inside the source host");
  if (pathContains(workspaceRoot, artifacts)) throw new Error("Evidence must not be inside the target host root; its snapshot holds full Content and public bytes");
  await assertUncommittableEvidence(artifacts);
  return { workspaceRoot, sourceRoot, artifacts };
}
