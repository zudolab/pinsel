import { expect, it } from "vitest";
import { projectHostedSite } from "zudo-composer/hosted-content";
import type { AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import { buildPinselSite } from "../site/structure";
import { readContentEntries } from "../site/entries";
import { contractPack } from "../site/contract-pack";
import { projectNativeModelGuidance } from "../site/native-model-guidance";
import { normalizeNoteRoutes } from "../site/migrate-note-routes";
import { canonicalSharedSources, migrateSharedSources, SHARED_MODELS, sharedSourceHash } from "../site/canonical-shared-sources";
const pack = contractPack();
const original = normalizeNoteRoutes(buildPinselSite(await readContentEntries(), pack).project);
const projectSite = (project: typeof original) => projectHostedSite({ project, componentPack: pack.manifest }, []);

it("changes only reviewed query pins, preserving every Content/schema/graph byte and original rendering", async () => {
  const before = structuredClone(original);
  const result = canonicalSharedSources(original);
  expect(result.changes).toHaveLength(56);
  const restored = structuredClone(result.project);
  for (const change of result.changes) {
    const mapping = restored.providers.mappings.find(p => p.id === change.providerId)!.records.find(r => r.id === change.recordId)!;
    mapping.document.mode = structuredClone(change.before) as typeof mapping.document.mode;
  }
  expect(restored).toEqual(original);
  expect(original).toEqual(before);
  expect(result.project.providers.content).toEqual(original.providers.content);
  const beforeRender = await projectSite(original), afterRender = await projectSite(result.project);
  expect(beforeRender.status).toBe("ready"); expect(afterRender.status).toBe("ready");
  if (beforeRender.status === "ready" && afterRender.status === "ready") expect(afterRender.routes).toEqual(beforeRender.routes);
  expect(canonicalSharedSources(result.project).changes).toEqual([]);
});
it.each(SHARED_MODELS)("keeps declared %s owner despite new draft/published entries; missing/ineligible owner blocks", async modelId => {
  const { project } = canonicalSharedSources(original);
  const content = project.providers.content[0]!;
  const owner = content.entries.find(entry => entry.id === modelId)!;
  const beforeRender = await projectSite(project);
  const copy = structuredClone(owner); copy.id = "000-disposable-copy";
  for (const field of Object.keys(copy.values)) if (typeof copy.values[field] === "string") copy.values[field] = "Unrelated duplicate";
  copy.lifecycle = "draft"; content.entries.push(copy);
  for (const lifecycle of ["draft", "published"] as const) {
    copy.lifecycle = lifecycle;
    const rendered = await projectSite(project);
    expect(rendered.status).toBe("ready");
    if (rendered.status === "ready" && beforeRender.status === "ready") expect(rendered.routes).toEqual(beforeRender.routes);
  }
  owner.lifecycle = "draft";
  expect((await projectSite(project)).status).toBe("blocked");
  content.entries = content.entries.filter(entry => entry !== owner);
  expect((await projectSite(project)).status).toBe("blocked");
});
it("preserves unrelated drafts and refuses custom or ambiguous legacy choices without input changes", () => {
  const draftProject = structuredClone(original);
  const copy = structuredClone(draftProject.providers.content[0]!.entries.find(entry => entry.id === "site-copy")!);
  copy.id = "000-extra-draft"; copy.lifecycle = "draft"; draftProject.providers.content[0]!.entries.push(copy);
  expect(canonicalSharedSources(draftProject).project.providers.content).toEqual(draftProject.providers.content);
  for (const kind of ["query", "pin", "unknown-mapping", "provider", "duplicate-published", "missing-owner", "draft-owner"]) {
    const project = structuredClone(draftProject);
    const mapping = project.providers.mappings[0]!.records.find(record => record.id === "frame-header")!;
    if (mapping.document.mode.kind !== "collection") throw new Error("fixture");
    if (kind === "query") mapping.document.mode.query.limit = 2;
    if (kind === "pin") mapping.document.mode.query.pins = [{ providerId: "content-filesystem", modelId: "site-copy", recordId: "custom" }];
    if (kind === "unknown-mapping") mapping.id = mapping.document.id = "authored-mapping";
    if (kind === "provider") mapping.document.contentModel.providerId = "foreign";
    if (kind === "duplicate-published") project.providers.content[0]!.entries.find(e => e.id === copy.id)!.lifecycle = "published";
    if (kind === "missing-owner") project.providers.content[0]!.entries = project.providers.content[0]!.entries.filter(e => e.id !== "site-copy");
    if (kind === "draft-owner") project.providers.content[0]!.entries.find(e => e.id === "site-copy")!.lifecycle = "draft";
    const before = structuredClone(project); expect(() => canonicalSharedSources(project)).toThrow(); expect(project).toEqual(before);
  }
});
it("binds migration to exact reviewed capture and records every change without rewriting original Assets/history inputs", () => {
  const body = { schemaVersion: 1, workspaceId: "pinsel", renderer: { id: "pinsel-zfb", version: "native-v3" }, project: original, tokens: { content: 7 }, assets: { exact: "retained" }, publicFiles: [] };
  const snapshot = { ...body, digest: sharedSourceHash(body) } as unknown as AuthoringWorkspaceSnapshot;
  const before = structuredClone(snapshot);
  const candidate = migrateSharedSources(snapshot, snapshot.digest);
  expect(snapshot).toEqual(before);
  expect(candidate.evidence.changes).toHaveLength(56);
  expect(candidate.evidence.modelDescriptions).toHaveLength(3);
  expect(candidate.project.providers.content).toEqual(projectNativeModelGuidance(original).providers.content);
  expect(candidate.evidence.contentDigest).toBe(sharedSourceHash(projectNativeModelGuidance(original).providers.content));
  const customBody = structuredClone(body);
  customBody.project.providers.content[0]!.models.find(model => model.id === "course")!.document.description = "Custom Course instructions";
  const customSnapshot = { ...customBody, digest: sharedSourceHash(customBody) } as unknown as AuthoringWorkspaceSnapshot;
  const custom = migrateSharedSources(customSnapshot, customSnapshot.digest);
  expect(custom.evidence.modelDescriptions).toHaveLength(2);
  expect(custom.project.providers.content[0]!.models.find(model => model.id === "course")!.document.description).toBe("Custom Course instructions");
  expect(candidate.evidence.projectDigest).toBe(sharedSourceHash(candidate.project));
  expect(() => migrateSharedSources(snapshot, "0".repeat(64))).toThrow();
  snapshot.project = structuredClone(original); snapshot.project.name += " changed";
  expect(() => migrateSharedSources(snapshot, snapshot.digest)).toThrow();
});
