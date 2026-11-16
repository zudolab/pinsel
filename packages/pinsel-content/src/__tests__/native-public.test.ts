import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { nativePublicFiles, prepareNativePublic } from "../site/prepare-native-public";

it.each([".native-public", ".native-public-course-identity-v1"])("prepares captured visitor sources and assets under %s", async directory => {
  const root = await mkdtemp(join(tmpdir(), "pinsel-native-public-"));
  try {
    const publicRoot = join(root, directory);
    await prepareNativePublic(publicRoot);
    const files = await nativePublicFiles(root, publicRoot);
    expect(files.some(file => file.fileName === "assets/fonts/fonts.css")).toBe(true);
    expect(files.some(file => file.fileName.includes(".test."))).toBe(false);
    expect(files.every(file => file.sourcePath === `${directory}/${file.fileName}`)).toBe(true);
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
