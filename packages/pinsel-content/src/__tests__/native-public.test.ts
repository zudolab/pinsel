import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { nativePublicFiles, prepareNativePublic } from "../site/prepare-native-public";

it("prepares the production visitor sources and exact public assets for capture", async () => {
  const root = await mkdtemp(join(tmpdir(), "pinsel-native-public-"));
  try {
    const publicRoot = join(root, ".native-public");
    await prepareNativePublic(publicRoot);
    const files = await nativePublicFiles(root, publicRoot);
    expect(files.some(file => file.fileName === "assets/fonts/fonts.css")).toBe(true);
    expect(files.some(file => file.fileName.includes(".test."))).toBe(false);
    const scriptRoot = join(publicRoot, "assets/pinsel-native");
    const scripts = await readdir(scriptRoot);
    for (const name of scripts) {
      const source = await readFile(join(scriptRoot, name), "utf8");
      for (const match of source.matchAll(/from\s+["']\.\/([^"']+)["']/g)) expect(scripts).toContain(match[1]);
    }
    expect(await readFile(join(scriptRoot, "start.js"), "utf8")).toContain("initSite()");
    expect(await readFile(join(publicRoot, "assets/pinsel-native.css"), "utf8")).toContain("@layer tokens");
  } finally { await rm(root, { recursive: true, force: true }); }
});
