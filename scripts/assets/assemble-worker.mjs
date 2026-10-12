// The only writer of apps/authoring-worker/dist-assets/. Order is fixed: the
// pinsel-ui public assets land first and the editor build may only add files,
// so an editor build can never replace or erase preview fonts, CSS or images.
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { copyTree, exists, listFiles, paths, repoRoot, sha256File } from "./lib.mjs";

const MANIFEST_NAME = "assets-manifest.json";

const out = paths.workerAssets;
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

/** @type {Map<string, string>} relative path -> source label */
const sources = new Map();
for (const rel of await copyTree(paths.uiPublic, out, { overwrite: false })) sources.set(rel, "pinsel-ui");

const editorPresent = await exists(paths.editorDist);
if (editorPresent) {
  for (const rel of await copyTree(paths.editorDist, out, { overwrite: false })) sources.set(rel, "editor");
}

const files = [];
for (const rel of await listFiles(out)) {
  const source = sources.get(rel);
  if (!source) throw new Error(`unexpected file in ${path.relative(repoRoot, out)}: ${rel}`);
  files.push({ path: rel, source, sha256: await sha256File(path.join(out, rel)) });
}

const manifest = {
  sources: {
    "pinsel-ui": path.relative(repoRoot, paths.uiPublic),
    editor: editorPresent ? path.relative(repoRoot, paths.editorDist) : null,
  },
  files,
};
await writeFile(path.join(out, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
// Keeps the manifest itself out of the Worker's uploaded static assets.
await writeFile(path.join(out, ".assetsignore"), `${MANIFEST_NAME}\n`);

console.log(
  `assets:assemble-worker staged ${files.length} files in ${path.relative(repoRoot, out)} ` +
    `(pinsel-ui: ${files.filter((f) => f.source === "pinsel-ui").length}, editor: ${editorPresent ? files.filter((f) => f.source === "editor").length : "absent"})`,
);
