// Prices for the Worker, editor, browser and Gate-1 tests that edit committed
// course prices. Every value lies above each amount found in the committed
// text, so an edit is never a no-op and never already on a rendered page,
// whatever price a publication set.

/** @param {number} amount */
function yen(amount) {
  return `¥${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/**
 * @param {readonly unknown[]} committed committed course prices and any other committed text with a ¥ amount
 * @returns {(n: number) => string} the n-th (n >= 1) edit price; distinct n give distinct prices
 */
export function editPrices(committed) {
  const amounts = committed.flatMap((value) => (typeof value === "string" ? (value.match(/\d[\d,]*/g) ?? []) : [])).map((digits) => Number(digits.replaceAll(",", "")));
  const floor = Math.floor(Math.max(0, ...amounts) / 1000) * 1000;
  return (n) => {
    if (!Number.isInteger(n) || n < 1) throw new RangeError(`edit price index must be a positive integer, got ${n}`);
    return yen(floor + n * 1000);
  };
}

/**
 * The committed text `editPrices` needs, read from content/entries: every course price and every string value with a ¥ in it.
 * @param {readonly { modelId?: string, values: Record<string, unknown> }[]} entries
 * @param {string} priceField
 */
export function committedAmounts(entries, priceField) {
  return entries.flatMap((entry) => Object.entries(entry.values).filter(([key, value]) => typeof value === "string" && (key === priceField || value.includes("¥"))).map(([, value]) => value));
}
