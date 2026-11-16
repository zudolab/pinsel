import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { canonicalStringifyJson, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import type { JsonValue } from "@zudo-composer/component-contract";
import { projectHostedSite } from "zudo-composer/hosted-content";
import { buildPinselSite } from "../site/structure";
import { contractPack } from "../site/contract-pack";
import { PINSEL_MODELS } from "../models";
import { readContentEntries } from "../site/entries";
import { migrateCourseIdentity, verifyImportedCourseContent } from "../site/migrate-course-identity";

const stamp = "2026-09-12T00:00:00.000Z";
const hash = (value: unknown) => createHash("sha256").update(canonicalStringifyJson(value as JsonValue)).digest("hex");
const signed = (value: AuthoringWorkspaceSnapshot) => { const { digest: _, ...body } = value; return { ...body, digest: hash(body) }; };
async function source() {
  const mapping = (id: string, bindings: unknown[], operator?: string) => ({ id, createdAt: stamp, updatedAt: stamp, document: {
    schemaVersion: 2, id, name: id, contentModel: { providerId: "content-filesystem", recordId: "course" }, composition: { providerId: "files", recordId: id },
    mode: { kind: "collection", query: { publication: "published-only", conditions: operator ? [{ fieldId: "course-order", operator, value: 1 }] : [], sort: [{ fieldId: "course-order", direction: "asc" }], pins: [], limit: 1000 } }, bindings,
  } });
  const composition = (id: string, componentId: string, nodeId: string, props: object) => ({ id, createdAt: stamp, updatedAt: stamp, document: {
    schemaVersion: 2, id, name: id, root: [{ id: nodeId, componentId, componentVersion: 1, props, slots: {} }],
  } });
  // Old-format source fixture uses the actual committed Content, including all
  // independent excerpts and references. It never calls the new structure DSL.
  return signed({ schemaVersion: 1, workspaceId: "pinsel", tokens: { content: 10 }, project: {
    schemaVersion: 1, id: "pinsel", name: "Pinsel", componentPack: { contractVersion: 2, packId: "pinsel", packVersion: "0.2.0" },
    providers: {
      content: [{ id: "content-filesystem", models: PINSEL_MODELS, entries: await readContentEntries() }],
      compositions: [{ id: "files", records: [composition("home-pricing-cards", "pinsel.pricing-card", "card", { courseIndex: 1, description: "Retained presentation copy" }), composition("contact-course-options", "pinsel.course-option", "option", { label: "" })] }],
      mappings: [{ id: "mapping-filesystem", records: [
        mapping("home-pricing-cards", [{ id: "stable-existing-binding", sourceFieldId: "course-order", projection: { kind: "value" }, target: { nodeId: "card", prop: "courseIndex" }, transform: { kind: "identity" } }]),
        mapping("contact-course-options", []), mapping("lessons-consultation-course", [], "equals"), mapping("lessons-price-cards", [], "not-equals"),
      ] }], sitemaps: [],
    }, collectionAttachments: [],
  }, renderer: { id: "pinsel-zfb", version: "native-v1" }, componentPack: {}, assets: {}, publicFiles: [], digest: "" } as unknown as AuthoringWorkspaceSnapshot);
}

it("preserves every Content field/value/reference and migrates only reviewed identities and membership", async () => {
  const original = await source();
  const before = structuredClone(original);
  const { project, evidence } = migrateCourseIdentity(original, original.digest);
  expect(original).toEqual(before);
  expect(project.providers.content).toEqual(original.project.providers.content);
  expect(evidence.retainedFields).toBe(181);
  expect(evidence.retainedEntries).toBe(246);
  expect(project.providers.compositions[0]!.records[0]!.document.root[0]).toMatchObject({ id: "card", componentVersion: 2, props: { description: "Retained presentation copy" } });
  expect(project.providers.compositions[0]!.records[0]!.document.root[0]!.props).not.toHaveProperty("courseIndex");
  expect(project.providers.compositions[0]!.records[0]!.document.root[0]!.props).not.toHaveProperty("courseId");
  expect(project.providers.mappings[0]!.records[0]!.document.bindings[0]).toEqual({ id: "stable-existing-binding", source: { kind: "entry-id" }, target: { nodeId: "card", prop: "courseId" }, transform: { kind: "identity" } });
  const membership = project.providers.mappings[0]!.records[2]!.document.mode;
  expect(membership).toMatchObject({ kind: "collection", query: { conditions: [], pins: [{ providerId: "content-filesystem", modelId: "course", recordId: "consultation" }] } });
  expect(evidence.changes.every(change => !change.path.startsWith("/providers/content"))).toBe(true);
});

it("retains changed prices and arrangement while selecting Consultation by fixed identity", async () => {
  const original = await source();
  const consultation = original.project.providers.content[0]!.entries.find(entry => entry.id === "consultation")!;
  original.project.providers.content[0]!.entries.find(entry => entry.id === "two-month")!.values["course-order"] = 4;
  consultation.values["course-price"] = "¥12,345";
  const current = signed(original);
  const migrated = migrateCourseIdentity(current, current.digest);
  expect(migrated.project.providers.content).toEqual(current.project.providers.content);
  expect(migrated.evidence.sourceDigest).toBe(current.digest);
});

it("refuses stale/tampered captures and unexpected source bindings without mutating input", async () => {
  const original = await source();
  expect(() => migrateCourseIdentity(original, "0".repeat(64))).toThrow("digest mismatch");
  original.project.name = "Changed after capture";
  expect(() => migrateCourseIdentity(original, original.digest)).toThrow("digest mismatch");
  const current = signed(original);
  current.project.providers.mappings[0]!.records[0]!.document.bindings[0]!.transform = { kind: "prefix", prefix: "unexpected" };
  const changed = signed(current);
  const before = structuredClone(changed);
  expect(() => migrateCourseIdentity(changed, changed.digest)).toThrow("binding differs");
  expect(changed).toEqual(before);
});

it("does not assign a foreign Composition with matching record/node IDs to the known owner", async () => {
  const original = await source();
  // Deliberately malformed serialized input bypasses the native-only static type.
  original.project.providers.compositions.push({ id: "foreign", records: [structuredClone(original.project.providers.compositions[0]!.records[1]!)] } as unknown as (typeof original.project.providers.compositions)[number]);
  const current = signed(original);
  expect(() => migrateCourseIdentity(current, current.digest)).toThrow("custom course option");
});

it("verifies actual imported Content and records only the initializer generation reset", async () => {
  const original = (await source()).project;
  original.providers.content[0]!.entries[0]!.generation = 9;
  const imported = structuredClone(original);
  imported.providers.content[0]!.entries[0]!.generation = 1;
  expect(verifyImportedCourseContent(original, imported)).toMatchObject({ verified: true, entries: 246, metadataChanges: [{ before: 9, after: 1, recordId: original.providers.content[0]!.entries[0]!.id }] });
  for (const mutate of [
    (project: typeof imported) => { project.providers.content[0]!.entries[0]!.values = {}; },
    (project: typeof imported) => { project.providers.content[0]!.entries[0]!.lifecycle = "draft"; },
    (project: typeof imported) => { project.providers.content[0]!.entries[0]!.updatedAt = "2099-01-01T00:00:00.000Z"; },
    (project: typeof imported) => { project.providers.content[0]!.entries[0]!.id = "changed"; },
    (project: typeof imported) => { project.providers.content[0]!.models.pop(); },
    (project: typeof imported) => { project.providers.content[0]!.entries[0]!.generation = 2; },
  ]) {
    const changed = structuredClone(imported); mutate(changed);
    expect(() => verifyImportedCourseContent(original, changed)).toThrow("Imported Content differs");
  }
});

it.each(["limit", "descending", "other-field", "publication", "consultation-membership", "paid-membership", "draft", "missing", "nonnumeric", "provider"])("refuses unsupported %s source without mutation", async kind => {
  const original = await source();
  const record = original.project.providers.mappings[0]!.records.find(record => record.id === "lessons-price-cards")!;
  if (record.document.mode.kind !== "collection") throw new Error("fixture mode");
  const query = record.document.mode.query;
  const entries = original.project.providers.content[0]!.entries;
  const consultation = entries.find(entry => entry.id === "consultation")!;
  const paid = entries.find(entry => entry.id === "two-month")!;
  if (kind === "limit") query.limit = 1;
  if (kind === "descending") query.sort[0]!.direction = "desc";
  if (kind === "other-field") query.sort[0]!.fieldId = "course-name";
  if (kind === "publication") query.publication = "include-drafts";
  if (kind === "consultation-membership") consultation.values["course-order"] = 4;
  if (kind === "paid-membership") paid.values["course-order"] = 1;
  if (kind === "draft") paid.lifecycle = "draft";
  if (kind === "missing") entries.splice(entries.indexOf(paid), 1);
  if (kind === "nonnumeric") paid.values["course-order"] = "2";
  if (kind === "provider") record.document.contentModel.providerId = "other-provider";
  const current = signed(original);
  const before = structuredClone(current);
  expect(() => migrateCourseIdentity(current, current.digest)).toThrow();
  expect(current).toEqual(before);
});

it.each([false, true])("preserves captured paid arrangement including ID ties (tie=%s)", async tie => {
  const original = await source();
  const entries = original.project.providers.content[0]!.entries;
  entries.find(entry => entry.id === "two-month")!.values["course-order"] = tie ? 2 : 3;
  entries.find(entry => entry.id === "four-month")!.values["course-order"] = 2;
  const current = signed(original);
  const migrated = migrateCourseIdentity(current, current.digest);
  expect(migrated.project.providers.content).toEqual(current.project.providers.content);
  const migratedMapping = migrated.project.providers.mappings[0]!.records.find(record => record.id === "lessons-price-cards")!;
  expect(migratedMapping.document.mode).toMatchObject({ query: { pins: [{ recordId: "four-month" }, { recordId: "two-month" }] } });
  // Compile the migrated query in the complete installed consumer project.
  const pack = contractPack();
  const project = buildPinselSite(entries, pack).project;
  const mapping = project.providers.mappings.flatMap(provider => provider.records).find(record => record.id === "lessons-price-cards")!;
  mapping.document.mode = migratedMapping.document.mode;
  const compiled = await projectHostedSite({ project, componentPack: pack.manifest }, []);
  if (compiled.status !== "ready") throw new Error(JSON.stringify(compiled));
  const lessons = compiled.routes.find(route => route.pathname === "/lessons")!;
  type Node = (typeof lessons.composition.document.root)[number];
  const names: unknown[] = [];
  const visit = (node: Node) => { if (node.componentId === "pinsel.price-detail-card") names.push(node.props.name); Object.values(node.slots).flat().forEach(visit); };
  lessons.composition.document.root.forEach(visit);
  expect(names).toEqual(["four-month", "two-month"].map(id => entries.find(entry => entry.id === id)!.values["course-name"]));
});
