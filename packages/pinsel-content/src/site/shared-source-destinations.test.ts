import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { resolveSharedSourceDestinations } from "./shared-source-destinations";

it("resolves aliases before rejecting source/target/evidence overlap without creating output", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "pinsel-shared-boundary-")));
  try {
    const source = join(root, "source"), target = join(root, "target");
    await mkdir(source); await mkdir(target); await mkdir(join(source, "nested"));
    await symlink(source, join(root, "source-alias"));
    await expect(resolveSharedSourceDestinations(target, source, join(root, "source-alias", "evidence"))).rejects.toThrow("disjoint");
    await expect(resolveSharedSourceDestinations(join(source, "nested"), source, join(root, "evidence"))).rejects.toThrow("disjoint");
    await expect(resolveSharedSourceDestinations(join(root, "source-alias"), source, join(root, "evidence"))).rejects.toThrow("disjoint");
    expect(await readdir(source)).toEqual(["nested"]);
    expect(await readdir(target)).toEqual([]);
    await expect(resolveSharedSourceDestinations(target, source, join(root, "evidence"))).resolves.toEqual({ workspaceRoot: target, sourceRoot: source, artifacts: join(root, "evidence") });
    expect(await readdir(root)).not.toContain("evidence");
  } finally { await rm(root, { recursive: true }); }
});

it("refuses evidence inside the target host or an unignored Git work tree", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "pinsel-shared-evidence-")));
  try {
    const source = join(root, "source"), repo = join(root, "repo"), target = join(repo, "packages", "content");
    await mkdir(source); await mkdir(target, { recursive: true });
    execFileSync("git", ["init", "-q", repo]);
    await writeFile(join(repo, ".gitignore"), "ignored/\n");
    await mkdir(join(repo, "ignored")); await mkdir(join(repo, "tracked"));
    await expect(resolveSharedSourceDestinations(target, source, join(target, "evidence"))).rejects.toThrow("inside the target host root");
    await expect(resolveSharedSourceDestinations(target, source, join(repo, "tracked", "evidence"))).rejects.toThrow("not ignored");
    await expect(resolveSharedSourceDestinations(target, source, join(repo, "ignored", "evidence"))).resolves.toMatchObject({ artifacts: join(repo, "ignored", "evidence") });
    await expect(resolveSharedSourceDestinations(target, source, join(root, "evidence"))).resolves.toMatchObject({ artifacts: join(root, "evidence") });
    expect(await readdir(join(repo, "tracked"))).toEqual([]);
  } finally { await rm(root, { recursive: true }); }
});
