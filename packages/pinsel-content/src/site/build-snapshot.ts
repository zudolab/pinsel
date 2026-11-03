// Immutable local artifact. Never writes content/entries, the working D1 or its
// baseline; snapshot A can be built while the editor continues on draft B.
import { readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { h } from "@takazudo/zfb/zudo-react";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { DocumentShell, pinselPack, pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import { canonicalSerialize, type HostedSnapshot, type HostedSiteProjection } from "zudo-composer/hosted-content";
import { PINSEL_ROUTES, planPathname, outputFileForRoute } from "../invariants";
import { resolvePageMeta } from "./page-meta";
import { REPO_ROOT, SITE_PROJECT_PATH } from "./entries";
import { pinselHostedDefinitionDocument } from "../hosted-definition";
const file = process.argv.slice(2).find(value => value !== "--");
if (!file) throw new Error("Usage: pnpm build:snapshot -- <snapshot.json>");
const snapshot = JSON.parse(await readFile(resolve(file), "utf8")) as HostedSnapshot;
if (!snapshot || typeof snapshot.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(snapshot.id) || typeof snapshot.digest !== "string" || typeof snapshot.draftRevision !== "string") throw new Error("Invalid hosted snapshot envelope");
const { id, digest, ...payload } = snapshot;
// Composer digests the captured providers/assets/renderData; identities and opaque id are separate.
const actual = createHash("sha256").update(canonicalSerialize({ providers: snapshot.providers, assets: snapshot.assets, renderData: snapshot.renderData })).digest("hex");
if (actual !== digest) throw new Error("Snapshot digest does not verify");
const project = JSON.parse(await readFile(SITE_PROJECT_PATH, "utf8"));
const definitionDocument = pinselHostedDefinitionDocument(project, pinselPack.manifest);
const definition = createHash("sha256").update(canonicalSerialize(definitionDocument)).digest("hex");
if (snapshot.definition !== definition) throw new Error("Snapshot definition does not match this host's renderer/pack/policy. Build with its original verified checkout; the snapshot and draft remain unchanged.");
const plan = snapshot.renderData as unknown as HostedSiteProjection;
if (plan.status !== "ready") throw new Error("Snapshot projection is blocked");
const output = join(REPO_ROOT, ".dogfood/builds", id);
await mkdir(output, { recursive: true });
await cp(join(REPO_ROOT, "packages/pinsel-ui/public"), output, { recursive: true });
const css = (await Promise.all(["tokens.css", "colors.css", "components.css"].map(async name => { const text = await readFile(join(REPO_ROOT,"packages/pinsel-ui/styles",name),"utf8"); return name === "components.css" ? text : `@layer tokens {${text}}`; }))).join("\n");
for (const route of PINSEL_ROUTES) {
 const document = plan.routes.find(item => item.pathname === planPathname(route));
 if (!document) throw new Error(`Snapshot missing ${route}`);
 const meta = resolvePageMeta(route, snapshot.providers.flatMap(provider => provider.entries));
 const html = `<!doctype html>\n${renderToString(h(DocumentShell, { pathname: route, ...meta, robots: "noindex,nofollow", head: h("style", { rawHtml: css }) }, renderRouteDocument(document, pinselRegistry)))}`;
 const target = join(output, outputFileForRoute(route)); await mkdir(dirname(target), { recursive: true }); await writeFile(target, html);
}
const manifest = JSON.parse(await readFile(join(REPO_ROOT, "apps/authoring-worker/package.json"), "utf8"));
const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
await writeFile(join(output, "build-evidence.json"), JSON.stringify({ sourceSha, sourceDirty: !!execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: REPO_ROOT, encoding: "utf8" }).trim(), nodeVersion: process.versions.node, composerPackage: manifest.dependencies["zudo-composer"], contractPackage: manifest.dependencies["@zudo-composer/component-contract"], definition, pack: definitionDocument.pack, renderer: definitionDocument.renderer, snapshotId: id, snapshotDigest: digest, snapshotBaseline: snapshot.baseline }, null, 2));
await writeFile(join(output, "snapshot.json"), JSON.stringify(snapshot, null, 2));
console.log(`Built immutable snapshot ${id} (${digest}) to ${output}. Working draft unchanged.`);
