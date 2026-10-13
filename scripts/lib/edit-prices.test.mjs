import path from "node:path";
import { describe, expect, it } from "vitest";
import { readCommittedEntries } from "./committed-entries.mjs";
import { committedAmounts, editPrices } from "./edit-prices.mjs";

// Edit tests derive their prices from the committed content, so no published
// price can turn an edit into a no-op. Synthetic committed prices cover every
// literal the edit tests used before they were derived (¥51,000–¥63,000,
// ¥91,000–¥99,999), the migrated prices, and free-form owner text.

const root = path.resolve(import.meta.dirname, "../..");
const LEGACY_LITERALS = [...Array.from({ length: 13 }, (_, i) => (51 + i) * 1000), 91_000, 93_000, 94_000, 95_500, 96_000, 97_000, 98_000, 99_000, 99_999].map((amount) => `¥${amount.toLocaleString("en-US")}`);
const COMMITTED_SETS = [
  ["¥10,000", "¥50,000", "¥92,000"],
  ...LEGACY_LITERALS.map((price) => ["¥10,000", price, "¥92,000"]),
  ...LEGACY_LITERALS.map((price) => [price, price, price]),
  ["¥10,000", "¥58,000", "¥55,000"],
  ["応相談", "¥58,000（税込）", "¥120,500〜"],
  ["", "0", "¥999"],
  [],
];
const N = Array.from({ length: 60 }, (_, i) => i + 1);

describe("edit prices", () => {
  it.each(COMMITTED_SETS.map((set) => [JSON.stringify(set), set]))("never equal or appear inside a committed value, and are distinct (%s)", (_, committed) => {
    const editPrice = editPrices(committed);
    const prices = N.map(editPrice);
    expect(new Set(prices).size).toBe(prices.length);
    for (const price of prices) {
      expect(price).toMatch(/^¥\d{1,3}(?:,\d{3})+$/);
      for (const value of committed) {
        expect(value).not.toBe(price);
        expect(value.includes(price), `${value} contains ${price}`).toBe(false);
      }
    }
  });

  it("refuses an index that could collide", () => {
    const editPrice = editPrices(["¥50,000"]);
    for (const n of [0, -1, 1.5, Number.NaN]) expect(() => editPrice(n)).toThrow(RangeError);
  });

  it("collects every course price and every ¥ amount of the committed entries", () => {
    const entries = readCommittedEntries(root);
    const amounts = committedAmounts(entries, "course-price");
    const editPrice = editPrices(amounts);
    for (const id of ["consultation", "two-month", "four-month"]) expect(amounts).toContain(entries.find((entry) => entry.id === id)?.values["course-price"]);
    const text = JSON.stringify(entries);
    for (const n of N) expect(text).not.toContain(editPrice(n));
  });
});
