import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { compileSiteProjectPlan } from "zudo-composer/content";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { CONTENT_BASELINE_PATH, type ContentBaseline } from "../import-rules";
import { DEFAULT_IMPORT_ROOT } from "../import/import-seed";
import { routeForPlanPathname, type PinselRoute } from "../invariants";
import { checkPublication, protectedChecks, type DomDocument } from "../publication/check-publication";
import { assembleProjectText } from "../site/assemble";
import { contractPack } from "../site/contract-pack";
import { readContentEntries } from "../site/entries";
import { referenceDocument } from "./reference-dom";

// The publication checker against a dist rendered by the contract test double
// (reference-dom.ts). The same checker passes on the approved prototype dist
// (docs/content-model.md §9 records the manual run).

const pack = contractPack();
const entries = await readContentEntries();
const baseline = JSON.parse(await readFile(join(DEFAULT_IMPORT_ROOT, CONTENT_BASELINE_PATH), "utf8")) as ContentBaseline;
const window = new Window({ settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });

async function dist(from: readonly ContentEntryRecord[]): Promise<Map<PinselRoute, DomDocument>> {
  const compiled = await compileSiteProjectPlan(JSON.parse(assembleProjectText(from, pack)), pack.manifest);
  if (compiled.status !== "ready") throw new Error(compiled.status);
  return new Map(compiled.plan.routes.map((route) => [routeForPlanPathname(route.pathname)!, new window.DOMParser().parseFromString(referenceDocument(route, from), "text/html") as unknown as DomDocument]));
}

const edit = (from: readonly ContentEntryRecord[], id: string, fieldId: string, value: unknown) =>
  from.map((entry) => (entry.id === id ? { ...entry, values: { ...entry.values, [fieldId]: value } } : entry)) as ContentEntryRecord[];

describe("check-publication", () => {
  it("passes on the unmodified migration", async () => {
    const pages = await dist(entries);
    expect(await checkPublication({ entries, baseline, page: (route) => pages.get(route) })).toEqual([]);
  });

  it("passes after an allowed price and FAQ edit, and catches a dist that did not pick them up", async () => {
    // Values that differ from the committed ones in either content state (a publication may already carry ¥55,000).
    const price = entries.find((entry) => entry.id === "two-month")?.values["course-price"] === "¥55,000" ? "¥56,000" : "¥55,000";
    const edited = edit(edit(entries, "two-month", "course-price", price), "faq-exam-02", "faq-item-answer", "改訂した回答です。");
    const fresh = await dist(edited);
    expect(await checkPublication({ entries: edited, baseline, page: (route) => fresh.get(route) })).toEqual([]);
    const stale = await dist(entries);
    const issues = await checkPublication({ entries: edited, baseline, page: (route) => stale.get(route) });
    expect(issues.some((issue) => issue.includes("course/two-month.price"))).toBe(true);
    expect(issues.some((issue) => issue.includes("faq-item/faq-exam-02.answer"))).toBe(true);
  });

  it("checks school/department adjacency, collection order and missing outputs", async () => {
    const reordered = entries.map((entry) => (entry.id === "home-faq-01" ? { ...entry, values: { ...entry.values, "home-faq-order": 9 } } : entry));
    const pages = await dist(entries);
    const issues = await checkPublication({ entries: reordered, baseline, page: (route) => (route === "/voices/" ? undefined : pages.get(route)) });
    expect(issues).toContain("/voices/: output missing (/voices)");
    expect(issues.some((issue) => issue.startsWith("/ [home-faq.question"))).toBe(true);
    // Visible text between school and department breaks the seed checker's adjacency rule.
    type Editable = { querySelector(selector: string): { insertBefore(node: unknown, before: unknown): void; lastElementChild: unknown } | null; createTextNode(text: string): unknown };
    const results = pages.get("/results/") as unknown as Editable;
    const pair = results.querySelector("li.result-row > a > div")!;
    pair.insertBefore(results.createTextNode("★"), pair.lastElementChild);
    const broken = await checkPublication({ entries, baseline, page: (route) => pages.get(route) });
    expect(broken.some((issue) => issue.includes("department must directly follow school"))).toBe(true);
  });

  it("refuses protected-field edits and structure-bound creations/deletions", () => {
    expect(protectedChecks(entries, baseline)).toEqual([]);
    expect(protectedChecks(edit(entries, "nav-lessons", "nav-link-href", "/classes/"), baseline)).toEqual(["nav-link/nav-lessons: a protected field changed (route/href/slug/structure-owned values)"]);
    expect(protectedChecks(edit(entries, "free-tuition", "note-slug", "tuition"), baseline)).toHaveLength(1);
    expect(protectedChecks(edit(entries, "two-month", "course-price", "¥55,000"), baseline)).toEqual([]);
    const extraCourse = { ...entries.find((entry) => entry.id === "two-month")!, id: "course-new" };
    expect(protectedChecks([...entries, extraCourse], baseline)).toEqual(["course/course-new: new entry, but course does not allow creation"]);
    const extraTarget = { ...entries.find((entry) => entry.id === "home-01")!, id: "target-item-new" };
    expect(protectedChecks([...entries, extraTarget], baseline)).toEqual([]);
    expect(protectedChecks(entries.filter((entry) => entry.id !== "page-faq"), baseline)).toEqual(["page-copy/page-faq: deleted, but page-copy does not allow deletion"]);
  });
});
