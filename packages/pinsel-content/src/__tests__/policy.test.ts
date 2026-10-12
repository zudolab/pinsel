import { describe, expect, it } from "vitest";

import { PINSEL_MODELS, fieldId } from "../models";
import { EVERY_OPERATION, PINSEL_CONTENT_POLICY, authorizeContentMutation, isValueValidForSchema, readOnlyFields } from "../policy";
import { buildSeedEntries, ref } from "./seed-entries";

const seedEntries = buildSeedEntries(PINSEL_MODELS);
const idsOf = (modelId: string) => seedEntries.filter((entry) => entry.modelId === modelId).map((entry) => entry.id);

function codes(result: ReturnType<typeof authorizeContentMutation>): string[] {
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

describe("PINSEL_CONTENT_POLICY", () => {
  it("covers every model and names only real field keys", () => {
    for (const model of PINSEL_MODELS) {
      const policy = PINSEL_CONTENT_POLICY.models[model.id];
      expect(policy, model.id).toBeDefined();
      const keys = model.document.fields.map((field) => field.key);
      for (const key of policy!.fields) expect(keys, `${model.id}.${key}`).toContain(key);
      if (model.document.kind === "single") expect(policy!.operations).toEqual(["update"]);
      if (model.document.kind === "collection") expect(policy!.fields, `${model.id} order is reorder-only`).not.toContain("order");
    }
  });

  it("keeps slugs, routes, hrefs and the course list read-only", () => {
    expect(readOnlyFields(PINSEL_CONTENT_POLICY, PINSEL_MODELS.find((model) => model.id === "note")!)).toEqual(["slug", "order"]);
    expect(readOnlyFields(PINSEL_CONTENT_POLICY, PINSEL_MODELS.find((model) => model.id === "page-copy")!)).toEqual(["route", "order"]);
    expect(readOnlyFields(PINSEL_CONTENT_POLICY, PINSEL_MODELS.find((model) => model.id === "nav-link")!)).toEqual(["href", "order"]);
    expect(PINSEL_CONTENT_POLICY.models.course!.operations).toEqual(["update"]);
    expect(PINSEL_CONTENT_POLICY.models.note!.operations).toEqual(["update", "reorder"]);
    expect(PINSEL_CONTENT_POLICY.models.testimonial!.operations).toEqual(EVERY_OPERATION);
  });
});

describe("authorizeContentMutation", () => {
  it("accepts a copy edit on an editable field", () => {
    const result = authorizeContentMutation({ kind: "update-entry", modelId: "course", entryId: "two-month", values: { price: "¥55,000" } });
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown model", () => {
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "secrets", entryId: "x", values: {} }))).toEqual(["unknown-model"]);
  });

  it("rejects an unknown field and a forbidden field separately", () => {
    const result = authorizeContentMutation({ kind: "update-entry", modelId: "note", entryId: "free-tuition", values: { slug: "cheap", nope: "x" } });
    expect(codes(result)).toEqual(["forbidden-field", "unknown-field"]);
  });

  it("rejects editing order directly and structure-bound operations", () => {
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "faq-item", entryId: "faq-exam-01", values: { order: 9 } }))).toEqual(["forbidden-field"]);
    expect(codes(authorizeContentMutation({ kind: "create-entry", modelId: "course", entryId: "six-month", values: {} }))).toEqual(["forbidden-operation"]);
    expect(codes(authorizeContentMutation({ kind: "delete-entry", modelId: "note", entryId: "free-tuition" }))).toEqual(["forbidden-operation"]);
    expect(codes(authorizeContentMutation({ kind: "create-entry", modelId: "site-copy", entryId: "site-copy-2", values: {} }))).toEqual(["forbidden-operation"]);
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "site-copy", entryId: "other", values: {} }))).toEqual(["unsafe-id"]);
  });

  it("rejects values of the wrong kind and empty required values", () => {
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "result-year", entryId: "year-2025", values: { declaredCount: "9" } }))).toEqual(["invalid-value"]);
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "result-year", entryId: "year-2025", values: { label: "" } }))).toEqual(["missing-required"]);
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "target-item", entryId: "home-01", values: { page: "about" } }))).toEqual(["invalid-value"]);
  });

  it("rejects unsafe links in url fields and non-allowlisted school URLs", () => {
    const base = { kind: "update-entry" as const, modelId: "result-entry", entryId: "year-2025-01" };
    // `javascript:` fails Composer's own url kind; the host rules narrow http/non-allowlisted https.
    expect(codes(authorizeContentMutation({ ...base, values: { url: "javascript:alert(1)" } }))).toEqual(["invalid-value"]);
    expect(codes(authorizeContentMutation({ ...base, values: { url: "mailto:a@b.c" } }))).toEqual(["unsafe-link"]);
    expect(codes(authorizeContentMutation({ ...base, values: { url: "http://www.udk-berlin.de/" } }))).toEqual(["unsafe-link"]);
    expect(codes(authorizeContentMutation({ ...base, values: { url: "https://example.com/" } }))).toEqual(["unsafe-link"]);
    expect(authorizeContentMutation({ ...base, values: { url: "https://www.udk-berlin.de/" } }).ok).toBe(true);
    expect(authorizeContentMutation({ ...base, values: { url: "" } }).ok).toBe(true);
  });

  it("rejects raw HTML and images in note markdown but accepts the allowed subset", () => {
    const base = { kind: "update-entry" as const, modelId: "note", entryId: "free-tuition" };
    expect(codes(authorizeContentMutation({ ...base, values: { body: "段落\n\n<script>alert(1)</script>" } }))).toEqual(["unsafe-markdown"]);
    expect(codes(authorizeContentMutation({ ...base, values: { body: "![x](/a.png)" } }))).toEqual(["unsafe-markdown"]);
    expect(codes(authorizeContentMutation({ ...base, values: { body: "[x](http://example.com)" } }))).toEqual(["unsafe-link"]);
    expect(authorizeContentMutation({ ...base, values: { body: "## 見出し\n\n本文 **強調** [お問い合わせ](/contact/)\n\n- 項目" } }).ok).toBe(true);
  });

  it("requires every required editable field on create and checks reference targets", () => {
    const create = { kind: "create-entry" as const, modelId: "faq-item", entryId: "faq-exam-99" };
    expect(codes(authorizeContentMutation({ ...create, values: { question: "Q" } }))).toEqual(["missing-required", "missing-required"]);
    expect(codes(authorizeContentMutation({ ...create, values: { group: ref("faq-item", "faq-exam"), question: "Q", answer: "A" } }))).toEqual(["invalid-value"]);
    expect(authorizeContentMutation({ ...create, values: { group: ref("faq-group", "faq-exam"), question: "Q", answer: "A" } }).ok).toBe(true);
    expect(codes(authorizeContentMutation({ ...create, entryId: "Bad Id", values: {} }))).toEqual(["unsafe-id"]);
    expect(codes(authorizeContentMutation({ ...create, entryId: "faq-exam-01", values: {} }, { existingEntryIds: idsOf("faq-item") }))).toEqual(["unsafe-id"]);
  });

  it("authorizes reorder only as a permutation of the existing ids", () => {
    const existing = idsOf("testimonial");
    const reversed = [...existing].reverse();
    expect(authorizeContentMutation({ kind: "reorder-entries", modelId: "testimonial", entryIds: reversed }, { existingEntryIds: existing }).ok).toBe(true);
    expect(codes(authorizeContentMutation({ kind: "reorder-entries", modelId: "testimonial", entryIds: reversed }))).toEqual(["invalid-request"]);
    expect(codes(authorizeContentMutation({ kind: "reorder-entries", modelId: "testimonial", entryIds: reversed.slice(1) }, { existingEntryIds: existing }))).toEqual(["invalid-request"]);
    expect(codes(authorizeContentMutation({ kind: "reorder-entries", modelId: "testimonial", entryIds: [...existing, existing[0]!] }, { existingEntryIds: existing }))).toEqual(["invalid-request"]);
    expect(codes(authorizeContentMutation({ kind: "reorder-entries", modelId: "course", entryIds: ["two-month", "consultation", "four-month"] }, { existingEntryIds: idsOf("course") }))).toEqual(["forbidden-operation"]);
  });

  it("updates only existing entries when the current ids are known", () => {
    expect(authorizeContentMutation({ kind: "update-entry", modelId: "legal-row", entryId: "legal-row-01", values: { value: "x" } }, { existingEntryIds: idsOf("legal-row") }).ok).toBe(true);
    expect(codes(authorizeContentMutation({ kind: "update-entry", modelId: "legal-row", entryId: "legal-row-99", values: { value: "x" } }, { existingEntryIds: idsOf("legal-row") }))).toEqual(["invalid-request"]);
  });

  it("deletes only existing entries of deletable collections", () => {
    expect(authorizeContentMutation({ kind: "delete-entry", modelId: "legal-row", entryId: "legal-row-08" }, { existingEntryIds: idsOf("legal-row") }).ok).toBe(true);
    expect(codes(authorizeContentMutation({ kind: "delete-entry", modelId: "legal-row", entryId: "legal-row-99" }, { existingEntryIds: idsOf("legal-row") }))).toEqual(["invalid-request"]);
  });

  it("accepts every seed entry's editable values as an update", () => {
    for (const entry of seedEntries) {
      const model = PINSEL_MODELS.find((candidate) => candidate.id === entry.modelId)!;
      const editable = PINSEL_CONTENT_POLICY.models[model.id]!.fields;
      const values = Object.fromEntries(
        model.document.fields.filter((field) => editable.includes(field.key) && entry.values[field.id] !== undefined).map((field) => [field.key, entry.values[field.id]!]),
      );
      const result = authorizeContentMutation({ kind: "update-entry", modelId: model.id, entryId: entry.id, values });
      expect(result.ok, `${entry.modelId}/${entry.id} ${JSON.stringify(codes(result))}`).toBe(true);
    }
  });
});

describe("isValueValidForSchema", () => {
  it("mirrors Composer's typed checks for the kinds in use", () => {
    expect(isValueValidForSchema({ kind: "slug" }, "free-tuition")).toBe(true);
    expect(isValueValidForSchema({ kind: "slug" }, "Free Tuition")).toBe(false);
    expect(isValueValidForSchema({ kind: "url" }, "/notes/x/")).toBe(true);
    expect(isValueValidForSchema({ kind: "url" }, "//evil.example")).toBe(false);
    expect(isValueValidForSchema({ kind: "number" }, Number.NaN)).toBe(false);
    expect(isValueValidForSchema({ kind: "list", item: { kind: "text" } }, ["a", 1])).toBe(false);
    const target = { providerId: "content-filesystem", recordId: "note" };
    expect(isValueValidForSchema({ kind: "reference-list", target, ordered: true }, [ref("note", "a"), ref("note", "a")])).toBe(false);
    expect(isValueValidForSchema({ kind: "reference-list", target, ordered: true }, [ref("note", "a"), ref("note", "b")])).toBe(true);
    expect(fieldId("note", "body")).toBe("note-body");
  });
});
