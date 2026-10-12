import { describe, expect, it } from "vitest";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { PAGE_COPY_IDS, PINSEL_ROUTES, SCHOOL_URL_ALLOWLIST, outputFileForRoute } from "../invariants";
import { readFixture } from "../import/seed-entries";
import { PINSEL_MODELS, SEED_DECLARED_RESULT_COUNT, SEED_ENTRY_COUNTS, fieldId } from "../models";
import { PUBLICATION_MAP, UNRENDERED_FIELDS } from "../publication-map";
import { readContentEntries } from "../site/entries";
import { resolvePageMeta } from "../site/page-meta";

// Record integrity of the committed content/entries against the approved seed.

const entries = await readContentEntries();
const seed = readFixture<{
  notes: Record<string, { body: string; title: string; description: string }>;
  data: { voicesData: { quote: string }[]; faqData: { items: { question: string }[] }[] };
}>("content.json");
const expected = readFixture<{ pages: { route: string; metadata: { title: string; description?: string } }[] }>("expected-content.json");

const of = (modelId: string) => entries.filter((entry) => entry.modelId === modelId);
const get = (entry: ContentEntryRecord | undefined, key: string) => entry?.values[fieldId(entry.modelId, key)];
const byId = (id: string) => entries.find((entry) => entry.id === id);
const sortedByOrder = (modelId: string) => [...of(modelId)].sort((left, right) => Number(get(left, "order")) - Number(get(right, "order")));

describe("migrated content/entries", () => {
  it("has the seed count for every model", () => {
    for (const model of PINSEL_MODELS) expect(of(model.id).length, model.id).toBe(SEED_ENTRY_COUNTS[model.id]);
    expect(entries).toHaveLength(246);
  });

  it("keeps result years and rows independent: 11 years declaring 123, 105 rows, every school linked", () => {
    expect(of("result-year")).toHaveLength(11);
    expect(of("result-year").reduce((sum, entry) => sum + Number(get(entry, "declaredCount")), 0)).toBe(SEED_DECLARED_RESULT_COUNT);
    const rows = of("result-entry");
    expect(rows).toHaveLength(105);
    expect(rows.every((row) => SCHOOL_URL_ALLOWLIST[String(get(row, "school"))] === get(row, "url"))).toBe(true);
    expect(new Set(rows.map((row) => get(row, "school"))).size).toBe(Object.keys(SCHOOL_URL_ALLOWLIST).length);
  });

  it("preserves the multi-paragraph testimonial quotes and keeps home voices separate", () => {
    const quotes = sortedByOrder("testimonial").map((entry) => get(entry, "quote"));
    expect(quotes).toEqual(seed.data.voicesData.map((voice) => voice.quote));
    expect(String(quotes[0])).toContain("\n");
    for (const voice of of("home-voice")) expect(quotes).not.toContain(get(voice, "quote"));
  });

  it("has 18 FAQ items in 4 groups and 4 home FAQ items that are not detail FAQ", () => {
    expect(of("faq-group")).toHaveLength(4);
    expect(of("faq-item")).toHaveLength(18);
    expect(of("faq-group").map((group) => of("faq-item").filter((item) => (get(item, "group") as { recordId: string }).recordId === group.id).length).sort()).toEqual([3, 3, 5, 7]);
    const detail = of("faq-item").map((item) => get(item, "question"));
    expect(of("home-faq")).toHaveLength(4);
    for (const item of of("home-faq")) expect(detail).not.toContain(get(item, "question"));
  });

  it("stores the five note bodies byte-identical to content.json with the index order", () => {
    for (const [slug, note] of Object.entries(seed.notes)) {
      const entry = byId(slug);
      expect(get(entry, "body"), slug).toBe(note.body);
      expect(get(entry, "title")).toBe(note.title);
    }
    expect(sortedByOrder("note").map((entry) => entry.id)).toEqual(["free-tuition", "what-is-mappe", "exam-schedule", "online-exam", "german-language"]);
  });

  it("keeps both course wordings and the ?course= order", () => {
    expect(sortedByOrder("course").map((entry) => [entry.id, get(entry, "price"), get(entry, "lessonsNote")])).toEqual([
      ["consultation", "¥10,000", "税込 / 1時間半〜2時間のオンライン通話"],
      ["two-month", "¥50,000", "税込 / 1ヶ月あたり25,000円"],
      ["four-month", "¥92,000", "税込 / 1ヶ月あたり23,000円"],
    ]);
    expect(of("course").map((entry) => get(entry, "homeDescription"))).not.toContain(undefined);
    expect(of("legal-row")).toHaveLength(8);
  });

  it("keeps the home excerpts distinct from the detail records", () => {
    const homeResults = sortedByOrder("home-result").map((entry) => `${get(entry, "school")} / ${get(entry, "detail")}`);
    expect(homeResults).toHaveLength(6);
    expect(homeResults).toContain("ウィーン応用美術大学 / Bildende Kunst");
    expect(of("result-entry").map((row) => `${get(row, "school")} / ${get(row, "department")}`)).not.toContain("ウィーン応用美術大学 / Bildende Kunst");
    expect(of("home-voice")).toHaveLength(3);
    expect(of("target-item").filter((item) => get(item, "page") === "home")).toHaveLength(5);
    expect(of("target-item").filter((item) => get(item, "page") === "lessons")).toHaveLength(7);
    const profile = byId("instructor-profile");
    expect(new Set([get(profile, "homeBio"), get(profile, "lessonsBio"), get(profile, "aboutMessage")]).size).toBe(3);
    const ctas = Object.values(PAGE_COPY_IDS).map((id) => get(byId(id), "ctaSubCopy")).filter(Boolean);
    expect(new Set(ctas).size).toBe(5);
  });

  it("resolves every route's <title> and description exactly as expected-content.json", () => {
    for (const route of PINSEL_ROUTES) {
      const page = expected.pages.find((candidate) => candidate.route === route || `${candidate.route}` === outputFileForRoute(route));
      expect(page, route).toBeDefined();
      const meta = resolvePageMeta(route, entries);
      expect(meta.title, route).toBe(page!.metadata.title);
      expect(meta.description, route).toBe(page!.metadata.description ?? "");
    }
  });

  it("maps every rendered field in the publication map", () => {
    for (const model of PINSEL_MODELS) {
      for (const field of model.document.fields) {
        // Placement and grouping fields are checked as the rows' filter / parent reference.
        const mapped = PUBLICATION_MAP.some((row) => row.model === model.id && (row.field === field.key || row.filter?.field === field.key || row.parent?.via === field.key));
        const unrendered = field.key === "order" || (UNRENDERED_FIELDS[model.id] ?? []).includes(field.key);
        expect(mapped || unrendered, `${model.id}.${field.key}`).toBe(true);
      }
    }
  });
});
