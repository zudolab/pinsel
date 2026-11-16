import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  captureAuthoringWorkspace, createFilesystemAssetStore, defineSite,
  initializeAuthoringWorkspace, node, resolveAuthoringPackIdentity,
  resolveAuthoringRendererIdentity, type AuthoringWorkspaceSnapshot,
} from "zudo-composer/authoring";
import { compileAuthoringWorkspaceSnapshot } from "zudo-composer/site-build";
import { createEditingService } from "zudo-composer/editing";
import { loadHostContext } from "zudo-composer/vite";
import type { SiteProject } from "zudo-composer/site-project";
import type { TrustedComponentPack } from "@zudo-composer/component-contract";
import { renderDocument } from "@pinsel/ui/host-document";
import { readContentEntries } from "../site/entries";
import { buildPinselSite } from "../site/structure";

// This small migration rehearsal keeps Pinsel's actual Mapping/Content owners
// and components, avoiding 177 sequential Composition imports per unit test.
async function firstSlice(pack: TrustedComponentPack): Promise<SiteProject> {
  const original = buildPinselSite(await readContentEntries(), pack).project;
  const site = defineSite({ id: "pinsel-native-first-slice", name: "Pinsel first slice", componentPack: pack });
  const home = site.page({ id: "home", name: "Home", root: [node("pinsel.group", {}, {}, "pricing")] });
  const lessons = site.page({ id: "lessons", name: "Lessons", root: [node("pinsel.section", { id: "local-lesson-notes", title: "Lessons", eyebrow: "Lessons" }, {
    content: [node("pinsel.prose-block", {}, { items: [node("pinsel.paragraph", { text: "Local lesson note" }, {}, "local-note")] }, "local-prose"), node("pinsel.group", {}, {}, "consultation")],
  }, "local-section")] });
  const contact = site.page({ id: "contact", name: "Contact", root: [node("pinsel.group", {}, {}, "form")] });
  site.sitemap({ id: "main", name: "Main", root: { id: "home", title: "Home", page: home, children: [
    { id: "lessons", title: "Lessons", slug: "lessons", page: lessons },
    { id: "contact", title: "Contact", slug: "contact", page: contact },
  ] } });
  const project = site.toSiteProject();
  const pieces = new Set(["home-pricing", "home-pricing-cards", "lessons-consultation", "lessons-consultation-course", "contact-form", "contact-course-options"]);
  project.providers.compositions[0]!.records.push(...original.providers.compositions[0]!.records.filter(record => pieces.has(record.id)));
  project.providers.mappings[0]!.records = original.providers.mappings[0]!.records.filter(record => pieces.has(record.id));
  const models = new Set(["site-copy", "lessons-copy", "course", "contact-copy", "page-copy"]);
  project.providers.content[0]!.models = original.providers.content[0]!.models.filter(record => models.has(record.id));
  project.providers.content[0]!.entries = original.providers.content[0]!.entries.filter(record => models.has(record.modelId));
  project.collectionAttachments = original.collectionAttachments.filter(attachment => pieces.has(attachment.composition.recordId)
    || ({ home: "pricing", lessons: "consultation", contact: "form" } as Record<string, string>)[attachment.composition.recordId] === attachment.target.nodeId);
  return project;
}

let root: string;
let host: Awaited<ReturnType<typeof loadHostContext>>;
let inputs: Parameters<typeof captureAuthoringWorkspace>[0];
let baseline: AuthoringWorkspaceSnapshot;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "pinsel-native-first-slice-"));
  const packageRoot = resolve(import.meta.dirname, "../..");
  await symlink(join(packageRoot, "node_modules"), join(root, "node_modules"), "dir");
  const pkg = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "pinsel-native-acceptance", type: "module", dependencies: pkg.dependencies }));
  await mkdir(join(root, "styles"));
  await writeFile(join(root, "styles/authoring.css"), await readFile(join(packageRoot, "styles/authoring.css")));
  await writeFile(join(root, "zudo-composer.config.ts"), `export default ${JSON.stringify({
    pack: "@pinsel/ui/composer-pack", dataDir: "native-data", styles: "styles/authoring.css", authoringAuthority: "workspace",
    nativeEditing: { source: "workspace", paragraph: { componentId: "pinsel.paragraph", textProp: "text" } },
    hostDocument: { module: "@pinsel/ui/host-document", rendererId: "pinsel-zfb", rendererVersion: "native-v3" },
  })};\n`);
  host = await loadHostContext({ workspaceRoot: root });
  await initializeAuthoringWorkspace({ ...host, project: await firstSlice(host.pack), workspaceId: "first-slice" });
  await createFilesystemAssetStore({ assetsStoreRoot: host.composerConfig.paths.assets });
  inputs = { ...host, packIdentity: await resolveAuthoringPackIdentity(host), renderer: await resolveAuthoringRendererIdentity(host) };
  baseline = await captureAuthoringWorkspace(inputs);
}, 120_000);
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

async function render(snapshot: AuthoringWorkspaceSnapshot) {
  const compiled = await compileAuthoringWorkspaceSnapshot({ ...inputs, snapshot });
  return new Map(await Promise.all(compiled.build.routes.map(async route => [route.pathname, await renderDocument({
    route, project: compiled.project, identity: { pathname: route.pathname, rendererId: inputs.renderer.id, rendererVersion: inputs.renderer.version }, targets: [],
  })] as const)));
}

it("uses installed immutable Composer APIs for Pinsel's actual nested consultation and shared presentation", async () => {
  expect(import.meta.resolve("zudo-composer/authoring")).toContain("node_modules");
  const pages = await render(baseline);
  expect([...pages.keys()].sort()).toEqual(["/", "/contact", "/lessons"]);
  const consultation = baseline.project.providers.content[0]!.entries.find(entry => entry.modelId === "course" && entry.id === "consultation")!;
  const price = String(consultation.values["course-price"]);
  expect(pages.get("/")).toContain(price);
  expect(pages.get("/lessons")).toContain(price);
  expect(pages.get("/contact")).toContain(String(consultation.values["course-contact-option-label"]));
  expect(pages.get("/lessons")).toContain('id="consultation"');
}, 120_000);

it("reviews and saves a nested local Lessons insertion; restart/capture/build and guarded undo preserve ownership", async () => {
  const service = await createEditingService({ workspaceRoot: root });
  const before = await captureAuthoringWorkspace(inputs);
  const plan = await service.plan({ workspaceId: "first-slice", page: "/lessons", after: { nodeId: "local-note" }, insert: { kind: "text", text: "Saved local consultation guidance" } });
  expect((await captureAuthoringWorkspace(inputs)).digest).toBe(before.digest);
  await service.apply({ planId: plan.id, approve: plan.digest });
  const saved = await captureAuthoringWorkspace(inputs);
  const restarted = await createEditingService({ workspaceRoot: root });
  expect((await restarted.inspect({ workspaceId: "first-slice", page: "/lessons" })).targets.some(target => target.nodeId === plan.generatedId)).toBe(true);
  const pages = await render(JSON.parse(JSON.stringify(saved)));
  expect(pages.get("/lessons")).toContain("Saved local consultation guidance");
  expect(pages.get("/")).not.toContain("Saved local consultation guidance");
  expect(saved.project.providers.content).toEqual(before.project.providers.content);
  const lesson = saved.project.providers.compositions[0]!.records.find(record => record.id === "lessons")!;
  expect(lesson.document.root[0]!.slots.content![0]!.slots.items!.map(child => child.id)).toEqual(["local-note", plan.generatedId]);
  await restarted.undo({ planId: plan.id, approve: plan.digest });
  expect((await render(await captureAuthoringWorkspace(inputs))).get("/lessons")).not.toContain("Saved local consultation guidance");
}, 120_000);

it("refuses mapped ownership targets, unsupported slot addressing and modified captures without canonical writes", async () => {
  const service = await createEditingService({ workspaceRoot: root });
  const before = await captureAuthoringWorkspace(inputs);
  await expect(service.plan({ workspaceId: "first-slice", page: "/lessons", after: { nodeId: "intro" }, insert: { kind: "text", text: "Must not shadow Content" } })).rejects.toThrow();
  await expect(service.plan({ workspaceId: "first-slice", page: "/lessons", after: { nodeId: "local-note", slotId: "course" }, insert: { kind: "text", text: "Invalid slot" } })).rejects.toThrow();
  expect((await captureAuthoringWorkspace(inputs)).digest).toBe(before.digest);
  const corrupted = structuredClone(before); corrupted.project.name = "Tampered";
  await expect(compileAuthoringWorkspaceSnapshot({ ...inputs, snapshot: corrupted })).rejects.toThrow("digest mismatch");
}, 120_000);

it("rehearses alternate imported shared course values across Home/Lessons/Contact; this is not a live Content edit", async () => {
  const project = structuredClone(baseline.project);
  const consultation = project.providers.content[0]!.entries.find(entry => entry.modelId === "course" && entry.id === "consultation")!;
  consultation.values["course-price"] = "REHEARSAL-PRICE-31415";
  consultation.values["course-contact-option-label"] = "REHEARSAL consultation option";
  await initializeAuthoringWorkspace({ ...host, project, workspaceId: "shared-rehearsal" });
  const staged = await captureAuthoringWorkspace(inputs);
  const pages = await render(staged);
  expect(pages.get("/")).toContain("REHEARSAL-PRICE-31415");
  expect(pages.get("/lessons")).toContain("REHEARSAL-PRICE-31415");
  expect(pages.get("/contact")).toContain("REHEARSAL consultation option");
  expect(staged.project.providers.compositions).toEqual(baseline.project.providers.compositions);
}, 120_000);
