import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAuthoringPackIdentity, resolveAuthoringRendererIdentity, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import { compileAuthoringWorkspaceSnapshot } from "zudo-composer/site-build";
import { loadHostContext } from "zudo-composer/vite";
import { renderDocument } from "@pinsel/ui/host-document";

const file = process.argv.slice(2).find(value => value !== "--");
if (!file) throw new Error("Usage: authoring:build -- <snapshot.json>");
const workspaceRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const host = await loadHostContext({ workspaceRoot });
const snapshot = JSON.parse(await readFile(resolve(file), "utf8")) as AuthoringWorkspaceSnapshot;
const packIdentity = await resolveAuthoringPackIdentity(host);
const renderer = await resolveAuthoringRendererIdentity({ composerConfig: host.composerConfig });
const compiled = await compileAuthoringWorkspaceSnapshot({ snapshot, pack: host.pack, packIdentity, renderer });
const output = join(workspaceRoot, ".native-builds", snapshot.digest);
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
for (const asset of compiled.assetFiles) {
  const target = resolve(output, asset.fileName);
  if (!target.startsWith(`${output}${sep}`)) throw new Error("Asset output escaped build root");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, asset.source);
}
for (const route of compiled.build.routes) {
  const relative = route.pathname.replace(/^\//, "");
  const target = resolve(output, relative.endsWith(".html") ? relative : join(relative, "index.html"));
  if (!target.startsWith(`${output}${sep}`)) throw new Error("Route output escaped build root");
  const html = await renderDocument({ route, project: compiled.project, identity: { pathname: route.pathname, rendererId: renderer.id, rendererVersion: renderer.version }, targets: [] });
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}
await writeFile(join(output, "build-evidence.json"), `${JSON.stringify({ snapshotDigest: snapshot.digest, workspaceId: snapshot.workspaceId, componentPack: snapshot.componentPack, renderer, routes: compiled.build.routes.map(route => route.pathname) }, null, 2)}\n`);
console.log(`Built exact native snapshot to ${output}. Authoring stores unchanged.`);
