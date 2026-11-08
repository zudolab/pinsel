export type DiffLine = { kind: "same" | "removed" | "added"; text: string };
export type DiffRow = DiffLine | { kind: "skipped"; count: number };

type Line = { text: string; key: string };
// Splits on every line terminator. "\n" and end-of-text share a key, while "\r\n" and a
// lone "\r" stay distinct, so an ending-only change still shows as a changed line.
function split(value: string): Line[] {
 const parts = value.split(/(\r\n|\r|\n)/), lines: Line[] = [];
 for (let index = 0; index < parts.length; index += 2) {
  const text = parts[index]!, ending = parts[index + 1] ?? "";
  lines.push({ text, key: ending === "\n" || ending === "" ? text : `${text}${ending}` });
 }
 return lines;
}
/** Above this many table cells the middle is shown as one removed block and one added block. */
export const MAX_DIFF_CELLS = 1_000_000;

/** Line-level LCS diff on the part between the shared prefix and suffix. */
export function diffLines(before: string, after: string): DiffLine[] {
 const a = split(before), b = split(after);
 let start = 0, endA = a.length, endB = b.length;
 while (start < endA && start < endB && a[start]!.key === b[start]!.key) start++;
 while (endA > start && endB > start && a[endA - 1]!.key === b[endB - 1]!.key) { endA--; endB--; }
 const lines: DiffLine[] = a.slice(0, start).map(line => ({ kind: "same", text: line.text }));
 const midA = a.slice(start, endA), midB = b.slice(start, endB);
 if ((midA.length + 1) * (midB.length + 1) > MAX_DIFF_CELLS) {
  for (const line of midA) lines.push({ kind: "removed", text: line.text });
  for (const line of midB) lines.push({ kind: "added", text: line.text });
 } else {
  const table = Array.from({ length: midA.length + 1 }, () => new Uint32Array(midB.length + 1));
  for (let i = midA.length - 1; i >= 0; i--) for (let j = midB.length - 1; j >= 0; j--) table[i]![j] = midA[i]!.key === midB[j]!.key ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
  let i = 0, j = 0;
  while (i < midA.length && j < midB.length) {
   if (midA[i]!.key === midB[j]!.key) { lines.push({ kind: "same", text: midA[i]!.text }); i++; j++; }
   else if (table[i + 1]![j]! >= table[i]![j + 1]!) lines.push({ kind: "removed", text: midA[i++]!.text });
   else lines.push({ kind: "added", text: midB[j++]!.text });
  }
  while (i < midA.length) lines.push({ kind: "removed", text: midA[i++]!.text });
  while (j < midB.length) lines.push({ kind: "added", text: midB[j++]!.text });
 }
 for (const line of a.slice(endA)) lines.push({ kind: "same", text: line.text });
 return lines;
}

/** Keeps `context` unchanged lines around each change and folds longer unchanged runs. */
export function foldUnchanged(lines: DiffLine[], context = 2): DiffRow[] {
 const keep = lines.map(line => line.kind !== "same");
 lines.forEach((line, index) => { if (line.kind !== "same") for (let offset = -context; offset <= context; offset++) if (lines[index + offset]) keep[index + offset] = true; });
 const rows: DiffRow[] = [];
 let skipped = 0;
 lines.forEach((line, index) => {
  if (keep[index]) { if (skipped) rows.push({ kind: "skipped", count: skipped }); skipped = 0; rows.push(line); }
  else skipped++;
 });
 if (skipped) rows.push({ kind: "skipped", count: skipped });
 return rows;
}
