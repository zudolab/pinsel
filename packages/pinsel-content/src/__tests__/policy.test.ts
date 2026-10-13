import { describe, expect, it } from "vitest";
import type { ContentSnapshot } from "zudo-composer/content";

import { PINSEL_CONTENT_PROVIDER_ID, PINSEL_MODELS, fieldId } from "../models";
import { EVERY_OPERATION, PINSEL_CONTENT_POLICY, PINSEL_EDITABLE_FIELDS, PINSEL_EDITOR_POLICY, authorizePinselMutation, readOnlyFields, refusePinselRequest } from "../policy";
import { buildSeedEntries, ref } from "../import/seed-entries";

const seedEntries = buildSeedEntries(PINSEL_MODELS);
const snapshot: ContentSnapshot = { providerId: PINSEL_CONTENT_PROVIDER_ID, mutationToken: 7, models: PINSEL_MODELS, entries: seedEntries };
const actor = { subject: "client@example.test" };
const idsOf = (modelId: string) => seedEntries.filter((entry) => entry.modelId === modelId).map((entry) => entry.id);

function values(modelId: string, byKey: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(byKey).map(([key, value]) => [fieldId(modelId, key), value]));
}

function put(modelId: string, entryId: string, byKey: Record<string, unknown>, expectedRevision = snapshot.mutationToken) {
  return { kind: "put-entry-values", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId, entryId, expectedRevision, values: values(modelId, byKey) };
}

function code(request: unknown): string | "ok" {
  const decision = authorizePinselMutation(actor, request, snapshot);
  return decision.ok ? "ok" : decision.code;
}

describe("PINSEL_CONTENT_POLICY", () => {
  it("covers every model with Composer field ids and the upstream operation vocabulary", () => {
    for (const model of PINSEL_MODELS) {
      const spec = PINSEL_EDITABLE_FIELDS[model.id]!;
      const policy = PINSEL_CONTENT_POLICY.models[model.id];
      expect(policy, model.id).toBeDefined();
      const ids = model.document.fields.map((field) => field.id);
      for (const id of policy!.fields) expect(ids, `${model.id}.${id}`).toContain(id);
      const order = fieldId(model.id, "order");
      expect(policy!.fields.filter((id) => id !== order)).toEqual(spec.fields.map((key) => fieldId(model.id, key)));
      expect(policy!.fields.includes(order), `${model.id} lists order iff it can reorder`).toBe(spec.operations.includes("reorder"));
      expect(PINSEL_EDITOR_POLICY.models[model.id]!.fields, `${model.id} editor never edits order`).not.toContain(order);
      if (model.document.kind === "single") expect(policy!.operations).toEqual(["put-entry-values"]);
    }
    expect(PINSEL_CONTENT_POLICY.projectId).toBe("pinsel");
    expect(PINSEL_CONTENT_POLICY.providerId).toBe(PINSEL_CONTENT_PROVIDER_ID);
  });

  it("keeps slugs, routes, hrefs and the course list read-only", () => {
    expect(readOnlyFields(PINSEL_EDITOR_POLICY, PINSEL_MODELS.find((model) => model.id === "note")!)).toEqual(["slug", "order"]);
    expect(readOnlyFields(PINSEL_EDITOR_POLICY, PINSEL_MODELS.find((model) => model.id === "page-copy")!)).toEqual(["route", "order"]);
    expect(readOnlyFields(PINSEL_EDITOR_POLICY, PINSEL_MODELS.find((model) => model.id === "nav-link")!)).toEqual(["href", "order"]);
    expect(readOnlyFields(PINSEL_CONTENT_POLICY, PINSEL_MODELS.find((model) => model.id === "course")!)).toEqual(["order"]);
    expect(PINSEL_CONTENT_POLICY.models.course!.operations).toEqual(["put-entry-values"]);
    expect(PINSEL_CONTENT_POLICY.models.note!.operations).toEqual(["put-entry-values", "reorder"]);
    expect(PINSEL_CONTENT_POLICY.models.testimonial!.operations).toEqual(EVERY_OPERATION);
  });
});

describe("authorizePinselMutation (Composer policy + Pinsel rules)", () => {
  it("accepts a copy edit on an editable field and derives one put-entry operation", () => {
    const decision = authorizePinselMutation(actor, put("course", "two-month", { price: "¥55,000" }), snapshot);
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.affectedEntryIds).toEqual(["two-month"]);
      expect(decision.mutation.operations).toHaveLength(1);
      expect(decision.mutation.expectedMutationToken).toBe(snapshot.mutationToken);
    }
  });

  it("refuses models outside the policy, protected fields, unknown fields and structure-bound operations", () => {
    expect(code(put("secrets", "x", {}))).toBe("forbidden");
    expect(code({ ...put("note", "free-tuition", {}), values: { [fieldId("note", "slug")]: "cheap" } })).toBe("forbidden");
    expect(code({ ...put("note", "free-tuition", {}), values: { "note-nope": "x" } })).toBe("unknown-field");
    expect(code(put("faq-item", "faq-exam-01", { order: 9 }))).toBe("forbidden");
    expect(code({ ...put("course", "six-month", { name: "x" }), kind: "create-entry" })).toBe("forbidden");
    expect(code({ kind: "delete-entry", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId: "note", entryId: "free-tuition", expectedRevision: snapshot.mutationToken })).toBe("forbidden");
    expect(code({ kind: "reorder", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId: "course", fieldId: fieldId("course", "order"), entryIds: ["two-month", "consultation", "four-month"], expectedRevision: snapshot.mutationToken })).toBe("forbidden");
  });

  it("refuses a stale revision, a wrong project and extra keys", () => {
    expect(code(put("course", "two-month", { price: "¥1" }, snapshot.mutationToken - 1))).toBe("stale");
    expect(code({ ...put("course", "two-month", { price: "¥1" }), projectId: "other" })).toBe("wrong-project");
    expect(code({ ...put("course", "two-month", { price: "¥1" }), role: "admin" })).toBe("malformed-request");
  });

  it("refuses values of the wrong kind through Composer's typed check", () => {
    expect(code(put("result-year", "year-2025", { declaredCount: "9" }))).toBe("invalid-value");
    expect(code(put("target-item", "home-01", { page: "about" }))).toBe("invalid-value");
    expect(code(put("faq-item", "faq-exam-01", { group: ref("faq-item", "faq-exam") }))).toBe("invalid-value");
    expect(code(put("faq-item", "faq-exam-01", { group: ref("faq-group", "nope") }))).toBe("unsafe-reference");
  });

  it("narrows url fields to internal paths, https and allowlisted school URLs", () => {
    expect(code(put("result-entry", "year-2025-01", { url: "javascript:alert(1)" }))).toBe("invalid-value");
    expect(code(put("result-entry", "year-2025-01", { url: "mailto:a@b.c" }))).toBe("unsafe-reference");
    expect(code(put("result-entry", "year-2025-01", { url: "http://www.udk-berlin.de/" }))).toBe("unsafe-reference");
    expect(code(put("result-entry", "year-2025-01", { url: "https://example.com/" }))).toBe("unsafe-reference");
    expect(code(put("result-entry", "year-2025-01", { url: "https://www.udk-berlin.de/" }))).toBe("ok");
    expect(code(put("result-entry", "year-2025-01", { url: "" }))).toBe("ok");
  });

  it("refuses raw HTML, images and unsafe links in note markdown but accepts the allowed subset", () => {
    expect(code(put("note", "free-tuition", { body: "段落\n\n<script>alert(1)</script>" }))).toBe("invalid-value");
    expect(code(put("note", "free-tuition", { body: "![x](/a.png)" }))).toBe("invalid-value");
    expect(code(put("note", "free-tuition", { body: "[x](http://example.com)" }))).toBe("unsafe-reference");
    expect(code(put("note", "free-tuition", { body: "## 見出し\n\n本文 **強調** [お問い合わせ](/contact/)\n\n- 項目" }))).toBe("ok");
    const refused = refusePinselRequest(put("note", "free-tuition", { body: "<b>x</b>" }));
    expect(refused?.path).toBe("values.note-body");
  });

  it("authorizes creation and reorder where the policy allows them", () => {
    // A created entry may carry its position; afterwards `order` changes only through `reorder`.
    const create = { ...put("faq-item", "faq-exam-99", { group: ref("faq-group", "faq-exam"), question: "Q", answer: "A", order: 99 }), kind: "create-entry" };
    expect(code(create)).toBe("ok");
    expect(code(put("faq-item", "faq-exam-01", { order: 9 }))).toBe("forbidden");
    expect(refusePinselRequest(put("faq-item", "faq-exam-01", { order: 9 }))?.path).toBe("values.faq-item-order");
    const existing = idsOf("testimonial");
    expect(code({ kind: "reorder", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId: "testimonial", fieldId: fieldId("testimonial", "order"), entryIds: [...existing].reverse(), expectedRevision: snapshot.mutationToken })).toBe("ok");
    expect(code({ kind: "delete-entry", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId: "legal-row", entryId: "legal-row-08", expectedRevision: snapshot.mutationToken })).toBe("ok");
    expect(code({ kind: "delete-entry", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId: "legal-row", entryId: "legal-row-99", expectedRevision: snapshot.mutationToken })).toBe("not-found");
  });

  it("accepts every seed entry's editable values as an update", () => {
    for (const entry of seedEntries) {
      const editable = PINSEL_EDITOR_POLICY.models[entry.modelId]!.fields;
      const subset = Object.fromEntries(Object.entries(entry.values).filter(([id]) => editable.includes(id)));
      const request = { kind: "put-entry-values", projectId: "pinsel", providerId: PINSEL_CONTENT_PROVIDER_ID, modelId: entry.modelId, entryId: entry.id, expectedRevision: snapshot.mutationToken, values: subset };
      expect(code(request), `${entry.modelId}/${entry.id}`).toBe("ok");
    }
  });
});
