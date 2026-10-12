import { describe, expect, it } from "vitest";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { planRebase } from "../src/baseline/three-way";
import { BASELINE } from "../src/site/baseline";
import { PRICE } from "./helpers";

const provider = BASELINE.project.providers.content[0]!;
const base = provider.entries;
const models = provider.models;
const withPrice = (entries: readonly ContentEntryRecord[], id: string, price: string) => entries.map((entry) => (entry.id === id ? { ...entry, values: { ...entry.values, [PRICE]: price }, generation: entry.generation + 1 } : entry));

describe("three-way rebase plan", () => {
  it("takes the canonical side for untouched entries and the draft side for draft-only edits", () => {
    const plan = planRebase(base, withPrice(base, "two-month", "¥55,000"), withPrice(base, "four-month", "¥99,000"), models);
    expect(plan.draftChanged).toBe(true);
    expect(plan.conflicts).toEqual([]);
    const price = (id: string) => plan.entries.find((entry) => entry.id === id)?.values[PRICE];
    expect([price("two-month"), price("four-month")]).toEqual(["¥55,000", "¥99,000"]);
  });

  it("treats identical changes on both sides and a revert-to-base edit as no conflict", () => {
    const same = planRebase(base, withPrice(base, "two-month", "¥60,000"), withPrice(base, "two-month", "¥60,000"), models);
    expect(same.conflicts).toEqual([]);
    const original = base.find((entry) => entry.id === "two-month")!.values[PRICE] as string;
    const reverted = planRebase(base, withPrice(base, "two-month", original), withPrice(base, "two-month", "¥60,000"), models);
    expect(reverted.draftChanged).toBe(false);
    expect(reverted.entries.find((entry) => entry.id === "two-month")?.values[PRICE]).toBe("¥60,000");
  });

  it("reports an entry removed on one side and changed on the other, resolvable by preference", () => {
    const draft = withPrice(base, "two-month", "¥55,000");
    const canonical = base.filter((entry) => entry.id !== "two-month");
    const plan = planRebase(base, draft, canonical, models);
    expect(plan.unresolved).toEqual([expect.objectContaining({ kind: "entry", entryId: "two-month" })]);
    expect(planRebase(base, draft, canonical, models, "draft").entries.some((entry) => entry.id === "two-month")).toBe(true);
    expect(planRebase(base, draft, canonical, models, "canonical").entries.some((entry) => entry.id === "two-month")).toBe(false);
  });

  it("refuses to keep a draft entry the new schema rejects, unless the canonical side is preferred", () => {
    const draft = withPrice(base, "two-month", "¥55,000");
    const narrowed = models.map((model) => (model.id === "course" ? { ...model, document: { ...model.document, fields: model.document.fields.filter((field) => field.id !== PRICE) } } : model));
    const canonical = base.map((entry) => {
      const { [PRICE]: _dropped, ...values } = entry.values;
      return { ...entry, values };
    });
    const plan = planRebase(base, draft, canonical, narrowed, "draft");
    expect(plan.unresolved.map((conflict) => conflict.kind)).toContain("schema");
    expect(planRebase(base, draft, canonical, narrowed, "canonical").unresolved).toEqual([]);
  });
});
