import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";

export async function prepareNativePublic(publicRoot: string): Promise<void> {
  const uiRoot = fileURLToPath(new URL("../../../pinsel-ui/", import.meta.url));
  await mkdir(publicRoot, { recursive: true });
  await cp(join(uiRoot, "public"), publicRoot, { recursive: true });
  const css = (await Promise.all(["tokens.css", "colors.css", "components.css"].map(async name => {
    const text = await readFile(join(uiRoot, "styles", name), "utf8");
    return name === "components.css" ? text : `@layer tokens {${text}}`;
  }))).join("\n");
  await writeFile(join(publicRoot, "assets/pinsel-native.css"), css);
  const destination = join(publicRoot, "assets/pinsel-native");
  await mkdir(destination, { recursive: true });
  for (const file of await readdir(join(uiRoot, "src/scripts"))) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const source = await readFile(join(uiRoot, "src/scripts", file), "utf8");
    const javascript = stripTypeScriptTypes(source).replace(/(from\s+["'])(\.\/[^"']+)(["'])/g, (_, before: string, path: string, after: string) => `${before}${path.replace(/\.ts$/, "")}.js${after}`);
    await writeFile(join(destination, file.replace(/\.ts$/, ".js")), javascript);
  }
  await writeFile(join(destination, "start.js"), 'import { initArtClock } from "./art-clock.js";\nimport { initMotion } from "./motion.js";\nimport { initSite } from "./site.js";\ninitArtClock();\ninitMotion();\ninitSite();\n');
}

export async function nativePublicFiles(workspaceRoot: string, publicRoot: string) {
  const files: { fileName: string; sourcePath: string }[] = [];
  const visit = async (relative: string): Promise<void> => {
    for (const entry of await readdir(join(publicRoot, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error("Native public assets must not contain symlinks");
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({ fileName: path, sourcePath: `.native-public/${path}` });
    }
  };
  if (dirname(publicRoot) !== workspaceRoot) throw new Error("Unexpected native public root");
  await visit("");
  return files.sort((a, b) => a.fileName.localeCompare(b.fileName));
}
