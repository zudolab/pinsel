import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { canonicalStringifyJson, validateSiteProject, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import type { JsonValue } from "@zudo-composer/component-contract";
import { contractPack } from "../site/contract-pack";
import { readContentEntries } from "../site/entries";
import { buildPinselSite } from "../site/structure";
import { projectNativeModelGuidance } from "../site/native-model-guidance";
import { migrateNoteRoutes, normalizeNoteRoutes } from "../site/migrate-note-routes";
import { migrateSharedSources } from "../site/canonical-shared-sources";
import { verifyImportedCourseContent } from "../site/migrate-course-identity";

const pack = contractPack();
const source = buildPinselSite(await readContentEntries(), pack).project;
const ids = ["nav-link", "page-copy", "course"];
const hash = (value: unknown) => createHash("sha256").update(canonicalStringifyJson(value as JsonValue)).digest("hex");
it("changes exactly three descriptions, preserving the full schema, records and every other project byte", () => {
  const before = structuredClone(source);
  const projected = projectNativeModelGuidance(source);
  const expected = structuredClone(source);
  for (const id of ids) {
    const model = projected.providers.content[0]!.models.find(model => model.id === id)!;
    expect(model.document.description).not.toBe(before.providers.content[0]!.models.find(model => model.id === id)!.document.description);
    expect(model.document.description).not.toMatch(/件|追加不可|変更不可/);
    expected.providers.content[0]!.models.find(model => model.id === id)!.document.description = model.document.description;
  }
  expect(projected).toEqual(expected);
  expect(source).toEqual(before);
  expect(projectNativeModelGuidance(projected)).toEqual(projected);
  expect(validateSiteProject(normalizeNoteRoutes(projected), { componentPack: pack.manifest }).ok).toBe(true);
});
it("preserves custom descriptions, missing models and other qualified owners", () => {
  const custom = structuredClone(source);
  for (const model of custom.providers.content[0]!.models) if (ids.includes(model.id)) model.document.description += " Custom";
  expect(projectNativeModelGuidance(custom)).toEqual(custom);
  const other = structuredClone(source);
  // Deliberately malformed external provider: the projection must not claim it.
  (other.providers.content[0]! as { id: string }).id = "other-content";
  expect(projectNativeModelGuidance(other)).toEqual(other);
  other.id = "another-site";
  other.providers.content[0]!.id = "content-filesystem";
  expect(projectNativeModelGuidance(other)).toEqual(other);
  other.id = "pinsel";
  other.providers.content[0]!.models = [];
  expect(projectNativeModelGuidance(other)).toEqual(other);
});
it("records exact metadata changes in staged migration evidence without changing the source capture or assets", () => {
  const project = structuredClone(source);
  project.componentPack.packVersion = "0.3.0";
  const body = { schemaVersion: 1, workspaceId: "pinsel", project, renderer: { id: "pinsel-zfb", version: "native-v2" },
    assets: { retained: "sentinel" }, publicFiles: [{ fileName: "asset.svg", base64: "ZXhhY3Q=" }], tokens: { content: 5 } };
  const snapshot = { ...body, digest: hash(body) } as unknown as AuthoringWorkspaceSnapshot;
  const before = structuredClone(snapshot);
  const migrated = migrateNoteRoutes(snapshot, snapshot.digest);
  expect(snapshot).toEqual(before);
  expect(migrated.project).toEqual(projectNativeModelGuidance(normalizeNoteRoutes(project)));
  const contentChanges = migrated.evidence.changes.filter(change => change.path.startsWith("/providers/content/"));
  expect(contentChanges).toHaveLength(3);
  expect(contentChanges.every(change => /^\/providers\/content\/0\/models\/\d+\/document\/description$/.test(change.path))).toBe(true);
  expect(migrated.evidence.contentDigest).toBe(hash(migrated.project.providers.content));
  expect(migrated.evidence.projectDigest).toBe(hash(migrated.project));
  expect(verifyImportedCourseContent(migrated.project, structuredClone(migrated.project)).verified).toBe(true);
  const damaged = structuredClone(migrated.project);
  damaged.providers.content[0]!.models[0]!.document.name += " changed";
  expect(() => verifyImportedCourseContent(migrated.project, damaged)).toThrow();
});

// Exact oldest text observed in canonical-staged-rehearsal-1/source-before.json.
// Do not load session artifacts or broaden this to substring/normalized matching.
it.each([
  "進路相談・2ヶ月・4ヶ月（3件、追加不可。並び順は ?course= の番号に対応）",
  "進路相談・2ヶ月・4ヶ月（3件）。表示順は識別子・お問い合わせリンクとは独立",
])("migrates the exact historical Course variant: %s", description => {
  const project = normalizeNoteRoutes(structuredClone(source));
  project.providers.content[0]!.models.find(model => model.id === "course")!.document.description = description;
  const body = { schemaVersion: 1, workspaceId: "pinsel", project, renderer: { id: "pinsel-zfb", version: "native-v3" }, tokens: { content: 5 } };
  const snapshot = { ...body, digest: hash(body) } as unknown as AuthoringWorkspaceSnapshot;
  const before = structuredClone(snapshot);
  const migrated = migrateSharedSources(snapshot, snapshot.digest);
  expect(snapshot).toEqual(before);
  expect(migrated.evidence.changes).toHaveLength(56);
  expect(migrated.evidence.modelDescriptions).toHaveLength(3);
  expect(migrated.evidence.modelDescriptions.find(change => change.modelId === "course")).toEqual({
    providerId: "content-filesystem", modelId: "course", before: description,
    after: "共有するコース情報・料金・お問い合わせ選択肢。表示順は識別子・お問い合わせリンクとは独立しています。",
  });
  const expectedContent = structuredClone(project.providers.content);
  for (const change of migrated.evidence.modelDescriptions) expectedContent.find(provider => provider.id === change.providerId)!.models.find(model => model.id === change.modelId)!.document.description = change.after;
  expect(migrated.project.providers.content).toEqual(expectedContent);
  for (const customDescription of [`${description} `, `${description} Custom`, `Custom ${description}`]) {
    const custom = structuredClone(project);
    custom.providers.content[0]!.models.find(model => model.id === "course")!.document.description = customDescription;
    expect(projectNativeModelGuidance(custom).providers.content[0]!.models.find(model => model.id === "course")!.document.description).toBe(customDescription);
  }
});
