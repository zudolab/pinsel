import { describe, expect, it } from "vitest";
import { fixtureComponentPack } from "@zudo-composer/component-contract/fixtures";
import { CONTENT_PROVIDER_ID, DEFAULT_TIMESTAMP, defineSite, node } from "zudo-composer/authoring";
import { canonicalStringifyJson, validateContentEntryRecord, validateContentModelRecord, validateSiteProject } from "zudo-composer/content";
import type { JsonValue } from "@zudo-composer/component-contract";
import type { ContentEntryRecord, ContentModelRecord, Model, SiteProject } from "zudo-composer/site-project";

import { PINSEL_CONTENT_PROVIDER_ID, MODEL_TIMESTAMP, PINSEL_MODELS, SEED_DECLARED_RESULT_COUNT, SEED_ENTRY_COUNTS, fieldId, modelById } from "../models";
import { modelInput } from "../models/dsl";
import { RECORD_ID_PATTERN } from "../policy";
import { buildSeedEntries } from "./seed-entries";

// Records are validated one by one with the `zudo-composer/content` validators
// and together through `validateSiteProject`, which runs the same validators
// over the whole project plus every cross-record edge.

function minimalProject(models: readonly ContentModelRecord[], entries: readonly ContentEntryRecord[]): SiteProject {
  const site = defineSite({ id: "pinsel", name: "Pinsel", componentPack: fixtureComponentPack });
  const page = site.page({ id: "home", name: "Home", root: [node("container")] });
  site.sitemap({ id: "main", name: "Main", root: { id: "root", title: "Home", page } });
  const project = site.toSiteProject();
  project.providers.content = [{ id: CONTENT_PROVIDER_ID, models: [...models], entries: [...entries] }];
  return project;
}

const canonical = (value: unknown) => canonicalStringifyJson(value as JsonValue);

const seedEntries = buildSeedEntries(PINSEL_MODELS);

describe("Pinsel content models", () => {
  it("use Composer's provider id and generation timestamp", () => {
    expect(PINSEL_CONTENT_PROVIDER_ID).toBe(CONTENT_PROVIDER_ID);
    expect(MODEL_TIMESTAMP).toBe(DEFAULT_TIMESTAMP);
  });

  it("equal the records Composer's authoring DSL derives from the same inputs", () => {
    const site = defineSite({ id: "pinsel", name: "Pinsel", componentPack: fixtureComponentPack });
    const built = new Map<string, Model>();
    for (const record of PINSEL_MODELS) {
      const model = site.model(modelInput(record, built));
      built.set(record.id, model);
      expect(model.record, record.id).toEqual(record);
      for (const field of record.document.fields) {
        expect(model.fieldId(field.key)).toBe(fieldId(record.id, field.key));
      }
    }
  });

  it("have unique, safe ids and no duplicate field keys", () => {
    const ids = PINSEL_MODELS.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const model of PINSEL_MODELS) {
      expect(model.id).toMatch(RECORD_ID_PATTERN);
      const keys = model.document.fields.map((field) => field.key);
      expect(new Set(keys).size, model.id).toBe(keys.length);
      for (const field of model.document.fields) expect(field.id).toMatch(RECORD_ID_PATTERN);
      if (model.document.kind === "collection") expect(keys, `${model.id} needs order`).toContain("order");
    }
  });

  it("validate every record and entry with the zudo-composer/content validators", () => {
    for (const record of PINSEL_MODELS) expect(validateContentModelRecord(record).ok, record.id).toBe(true);
    for (const entry of seedEntries) expect(validateContentEntryRecord(entry).ok, entry.id).toBe(true);
    expect(validateContentModelRecord({ ...PINSEL_MODELS[0], document: { ...PINSEL_MODELS[0]!.document, kind: "many" } }).ok).toBe(false);
  });

  it("validate together with one seed entry per record through validateSiteProject", () => {
    const project = minimalProject(PINSEL_MODELS, seedEntries);
    const result = validateSiteProject(project, { componentPack: fixtureComponentPack.manifest });
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("reject an entry whose value does not match its field kind", () => {
    const project = minimalProject(PINSEL_MODELS, seedEntries);
    const year = project.providers.content[0]!.entries.find((entry) => entry.modelId === "result-year")!;
    project.providers.content[0]!.entries.push({ ...year, id: "year-bad", values: { ...year.values, [fieldId("result-year", "declaredCount")]: "9" } });
    const result = validateSiteProject(project, { componentPack: fixtureComponentPack.manifest });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("invalid-entry-value");
  });

  it("reject a dangling reference and a wrong-provider reference", () => {
    const project = minimalProject(PINSEL_MODELS, seedEntries);
    const item = project.providers.content[0]!.entries.find((entry) => entry.modelId === "faq-item")!;
    const groupField = fieldId("faq-item", "group");
    project.providers.content[0]!.entries.push(
      { ...item, id: "faq-dangling", values: { ...item.values, [groupField]: { providerId: CONTENT_PROVIDER_ID, modelId: "faq-group", recordId: "nope" } } },
      { ...item, id: "faq-foreign", values: { ...item.values, [groupField]: { providerId: "other", modelId: "faq-group", recordId: "faq-exam" } } },
    );
    const result = validateSiteProject(project, { componentPack: fixtureComponentPack.manifest });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(2);
  });

  it("round-trip through canonical JSON without drift", () => {
    const project = minimalProject(PINSEL_MODELS, seedEntries);
    const first = canonical(project);
    const parsed = JSON.parse(first) as unknown;
    const result = validateSiteProject(parsed, { componentPack: fixtureComponentPack.manifest });
    expect(result.ok).toBe(true);
    expect(canonical(result.ok ? result.project : null)).toBe(first);
  });
});

describe("seed entries", () => {
  const byModel = new Map<string, ContentEntryRecord[]>();
  for (const entry of seedEntries) byModel.set(entry.modelId, [...(byModel.get(entry.modelId) ?? []), entry]);

  it("cover every model with the approved counts", () => {
    for (const [modelId, count] of Object.entries(SEED_ENTRY_COUNTS)) {
      expect(byModel.get(modelId)?.length ?? 0, modelId).toBe(count);
    }
    expect(byModel.size).toBe(PINSEL_MODELS.length);
  });

  it("encode 11 years whose declared counts sum to 123 over 105 detail rows", () => {
    const years = byModel.get("result-year")!;
    const sum = years.reduce((total, year) => total + (year.values[fieldId("result-year", "declaredCount")] as number), 0);
    expect(years).toHaveLength(11);
    expect(sum).toBe(SEED_DECLARED_RESULT_COUNT);
    expect(byModel.get("result-entry")).toHaveLength(105);
  });

  it("keep 18 FAQ items in 4 groups, 4 home FAQs, 5 testimonials, 5 notes, 8 legal rows, 3 courses", () => {
    expect(byModel.get("faq-item")).toHaveLength(18);
    const groupField = fieldId("faq-item", "group");
    const groups = new Set(byModel.get("faq-item")!.map((item) => (item.values[groupField] as { recordId: string }).recordId));
    expect(groups.size).toBe(4);
    expect(byModel.get("home-faq")).toHaveLength(4);
    expect(byModel.get("testimonial")).toHaveLength(5);
    expect(byModel.get("note")).toHaveLength(5);
    expect(byModel.get("legal-row")).toHaveLength(8);
    expect(byModel.get("course")).toHaveLength(3);
  });

  it("have safe unique ids, singleton ids equal to the model id, and every required value present", () => {
    const ids = seedEntries.map((entry) => `${entry.modelId}/${entry.id}`);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of seedEntries) {
      expect(entry.id).toMatch(RECORD_ID_PATTERN);
      const model = modelById(entry.modelId)!;
      if (model.document.kind === "single") expect(entry.id).toBe(model.id);
      for (const field of model.document.fields) {
        const value = entry.values[field.id];
        if (field.required) {
          expect(value, `${entry.modelId}/${entry.id}.${field.key}`).not.toBeUndefined();
          expect(value, `${entry.modelId}/${entry.id}.${field.key}`).not.toBe("");
        }
      }
      for (const key of Object.keys(entry.values)) {
        expect(model.document.fields.some((field) => field.id === key), `${entry.id} stray ${key}`).toBe(true);
      }
    }
  });

  it("number each collection 1..n without gaps", () => {
    for (const [modelId, entries] of byModel) {
      const model = modelById(modelId)!;
      if (model.document.kind !== "collection") continue;
      const orders = entries.map((entry) => entry.values[fieldId(modelId, "order")] as number);
      const grouped = new Map<string, number[]>();
      for (const entry of entries) {
        const scope = ["timeline-entry", "target-item", "faq-item", "result-entry"].includes(modelId)
          ? JSON.stringify(entry.values[fieldId(modelId, modelId === "faq-item" ? "group" : modelId === "result-entry" ? "year" : modelId === "target-item" ? "page" : "timeline")])
          : "";
        grouped.set(scope, [...(grouped.get(scope) ?? []), entry.values[fieldId(modelId, "order")] as number]);
      }
      for (const [scope, list] of grouped) {
        expect([...list].sort((a, b) => a - b), `${modelId} ${scope}`).toEqual(list.map((_, index) => index + 1));
      }
      expect(orders.every((order) => Number.isInteger(order) && order >= 1)).toBe(true);
    }
  });
});
