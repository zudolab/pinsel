import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The Worker, editor, browser and Gate-1 tests edit course prices to literal
// values (¥51,000 … ¥62,000) against the committed content. A publication that
// set a course to one of those values would turn an edit into a no-op, so a
// committed price either is still the migrated one or matches no test literal.

const root = path.resolve(import.meta.dirname, "..");
const SOURCES = ["apps/authoring-worker/test", "apps/editor/src/__tests__", "tests/browser", "scripts/gate1"];
// Same order as `pricingData` in the seed: packages/pinsel-content/src/import/seed-entries.ts `courseIds`.
const COURSE_IDS = ["consultation", "two-month", "four-month"];
const YEN = /¥\d{1,3}(?:,\d{3})+/g;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(?:[cm]?[jt]sx?)$/.test(name) ? [full] : [];
  });
}

function testLiterals() {
  const found = new Set();
  for (const file of SOURCES.flatMap((dir) => files(path.join(root, dir)))) {
    for (const match of readFileSync(file, "utf8").matchAll(YEN)) found.add(match[0]);
  }
  return found;
}

function migratedPrices() {
  const seed = JSON.parse(readFileSync(path.join(root, "tests/fixtures/approved-seed/content.json"), "utf8"));
  const pricing = seed.frontmatter["components/pricing-section/pricing-section.astro"].pricingData;
  return new Map(COURSE_IDS.map((id, index) => [id, pricing[index].price]));
}

function committedPrice(id) {
  const entry = JSON.parse(readFileSync(path.join(root, "content/entries/course", `${id}.json`), "utf8"));
  return entry.values["course-price"];
}

describe("edit-test literals", () => {
  it("are found in the test sources", () => {
    expect(testLiterals()).toContain("¥55,000");
  });

  it.each(COURSE_IDS)("never equal a changed committed price (%s)", (id) => {
    const committed = committedPrice(id);
    if (committed === migratedPrices().get(id)) return;
    expect(testLiterals(), `content/entries/course/${id}.json price ${committed} was published over the migrated value and is also an edit literal in the tests; pick test values that differ from it`).not.toContain(committed);
  });
});
