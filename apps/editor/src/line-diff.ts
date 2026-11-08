export type DiffLine = { kind: "same" | "removed" | "added"; text: string };
export type DiffRow = DiffLine | { kind: "skipped"; count: number };

/** Line-level LCS diff. Note bodies are short, so the quadratic table stays small. */
export function diffLines(before: string, after: string): DiffLine[] {
 const a = before.split(/\r?\n/), b = after.split(/\r?\n/);
 const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
 for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
 const lines: DiffLine[] = [];
 let i = 0, j = 0;
 while (i < a.length && j < b.length) {
  if (a[i] === b[j]) { lines.push({ kind: "same", text: a[i]! }); i++; j++; }
  else if (table[i + 1]![j]! >= table[i]![j + 1]!) lines.push({ kind: "removed", text: a[i++]! });
  else lines.push({ kind: "added", text: b[j++]! });
 }
 while (i < a.length) lines.push({ kind: "removed", text: a[i++]! });
 while (j < b.length) lines.push({ kind: "added", text: b[j++]! });
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
