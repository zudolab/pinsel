import { mkdtemp, mkdir, readFile, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { withAbsentNativeDestinations } from "./native-initialization-preflight";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true });
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pinsel-init-preflight-"));
  roots.push(root);
  const paths = [join(root, "data"), join(root, "public"), join(root, "evidence.json")] as const;
  let writes = 0;
  const initialize = async () => {
    writes++;
    await mkdir(paths[0]);
    await mkdir(paths[1]);
    await writeFile(join(paths[1], "asset.css"), "new asset");
    await writeFile(paths[2], "new evidence", { flag: "wx" });
    return "initialized";
  };
  return { root, paths, initialize, writes: () => writes };
}

describe("native initialization destination preflight", () => {
  it.each([0, 1, 2] as const)("refuses destination %i before any initialization writes", async index => {
    const f = await fixture();
    const existing = f.paths[index];
    const sentinel = index === 2 ? existing : join(existing, "saved.txt");
    if (index !== 2) await mkdir(existing);
    await writeFile(sentinel, "preserve saved bytes");
    const before = await readdir(f.root);

    await expect(withAbsentNativeDestinations(f.paths, f.initialize)).rejects.toThrow(existing);

    expect(f.writes()).toBe(0);
    expect(await readdir(f.root)).toEqual(before);
    expect(await readFile(sentinel, "utf8")).toBe("preserve saved bytes");
    if (index !== 2) expect(await readdir(existing)).toEqual(["saved.txt"]);
  });

  it("preserves a dangling destination symlink and creates no other output", async () => {
    const f = await fixture();
    const target = join(f.root, "missing");
    await symlink(target, f.paths[1]);
    await expect(withAbsentNativeDestinations(f.paths, f.initialize)).rejects.toThrow(f.paths[1]);
    expect(f.writes()).toBe(0);
    expect(await readdir(f.root)).toEqual(["public"]);
    expect(await readlink(f.paths[1])).toBe(target);
  });

  it("runs initialization once only after every destination is absent", async () => {
    const f = await fixture();
    await expect(withAbsentNativeDestinations(f.paths, f.initialize)).resolves.toBe("initialized");
    expect(f.writes()).toBe(1);
    expect(await readFile(f.paths[2], "utf8")).toBe("new evidence");
    expect(await readFile(join(f.paths[1], "asset.css"), "utf8")).toBe("new asset");
  });
});
