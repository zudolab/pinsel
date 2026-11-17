import { mkdtemp, mkdir, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { resolveSharedSourceDestinations } from "./shared-source-destinations";

it("resolves aliases before rejecting source/target/evidence overlap without creating output", async () => {
  const root = await mkdtemp(join(tmpdir(), "pinsel-shared-boundary-"));
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
