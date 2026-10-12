// Maps every value in content/entries back to its source: a path in the
// approved content.json (tests/fixtures/approved-seed), or, for the copy the
// approved prototype hard-codes, the line of build.py / ui.py / site.js that
// carries it (pass --prototype <seed>/prototype/src to verify those).
// Exit 1 when any value cannot be traced, i.e. was invented or truncated.
// Usage: node scripts/content/trace-to-source.mjs [--prototype <dir>] [--report <file.json>]
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @param {string} flag */
function argument(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

/**
 * Every string/number/boolean leaf of `value` with its JSON path.
 * @param {unknown} value @param {string} at @param {Map<string, string[]>} index
 */
function collect(value, at, index) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const key = typeof value === "string" ? value : JSON.stringify(value);
    index.set(key, [...(index.get(key) ?? []), at]);
  } else if (Array.isArray(value)) {
    value.forEach((item, position) => collect(item, `${at}[${position}]`, index));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collect(item, `${at}.${JSON.stringify(key).slice(1, -1).includes(".") ? JSON.stringify(key) : key}`, index);
  }
}

/**
 * Fields whose values are identifiers the structure keys on, not copy: they
 * trace to the seed record they identify (or the list the record came from).
 * @type {Record<string, (value: string, content: Record<string, unknown>) => string | null>}
 */
const STRUCTURE_KEYS = {
  "note-slug": (value, content) => (value in /** @type {Record<string, unknown>} */ (content.notes) ? `$.notes.${value} (key)` : null),
  "page-copy-route": (value) => (/^\/(?:[a-z]+\/)?$|^\/404\.html$/.test(value) ? `tests/fixtures/approved-seed/page-manifest.json route ${value}` : null),
  "target-item-page": (value) => ({ home: '$.frontmatter["src/pages/index.astro"].targetItems', lessons: '$.frontmatter["src/pages/lessons/index.astro"].recommendedItems' })[value] ?? null,
  "timeline-entry-timeline": (value) =>
    ({ "lessons-career": '$.frontmatter["src/pages/lessons/index.astro"].careerTimeline', "about-career": '$.frontmatter["src/pages/about/index.astro"].career', "about-education": '$.frontmatter["src/pages/about/index.astro"].education' })[value] ?? null,
};

/** @param {string} text */
const lines = (text) => text.split("\n").filter((line) => line.trim() !== "");

/**
 * @typedef {{ entry: string, field: string, value: unknown, source: string | null, how: string }} TraceRow
 * @param {{ entries: { id: string, modelId: string, values: Record<string, unknown> }[], content: unknown, prototype?: { file: string, text: string }[] }} input
 * @returns {TraceRow[]}
 */
export function trace({ entries, content, prototype }) {
  /** @type {Map<string, string[]>} */
  const exact = new Map();
  const sourceTree = /** @type {Record<string, unknown>} */ (content);
  // `markup` is raw template text, not content; it never counts as a source.
  for (const [key, value] of Object.entries(sourceTree)) if (key !== "markup") collect(value, `$.${key}`, exact);
  const strings = [...exact.keys()];
  /** @param {string} value */
  const find = (value) => exact.get(value)?.[0] ?? null;
  /** @param {string} value */
  const findPart = (value) => {
    for (const candidate of strings) {
      if (candidate.split(/\n|　/).map((part) => part.trim()).includes(value)) return `${exact.get(candidate)?.[0]} (line/segment)`;
    }
    return null;
  };
  /** @param {string} value */
  const findPrototype = (value) => {
    // `{label}` marks the runtime placeholder site.js interpolates (`${…}を入力してください。`).
    const pieces = value.split("{label}").filter(Boolean);
    for (const source of prototype ?? []) {
      const lineIndex = source.text.split("\n").findIndex((line) => pieces.every((piece) => line.includes(piece)) && (pieces.length === 1 && !value.includes("{label}") ? true : line.includes("${")));
      if (lineIndex !== -1) return `prototype ${source.file}:${lineIndex + 1}`;
    }
    return null;
  };

  /** @type {TraceRow[]} */
  const rows = [];
  for (const entry of entries) {
    for (const [field, value] of Object.entries(entry.values)) {
      const where = `${entry.modelId}/${entry.id}`;
      /** @param {string | null} source @param {string} how */
      const push = (source, how) => rows.push({ entry: where, field, value, source, how });
      const structureKey = STRUCTURE_KEYS[field];
      if (structureKey) {
        push(structureKey(String(value), sourceTree), "structure key");
      } else if (value && typeof value === "object") {
        const target = /** @type {{ modelId?: string, recordId?: string }} */ (value);
        push(entries.some((candidate) => candidate.modelId === target.modelId && candidate.id === target.recordId) ? `entry ${target.modelId}/${target.recordId}` : null, "reference");
      } else if (field.endsWith("-order")) {
        push(Number.isInteger(value) ? "seed position" : null, "order");
      } else if (typeof value === "boolean") {
        // `featured` is present-and-true in the seed or absent (false).
        push(value ? find("true") : "$.frontmatter (absent = false)", "boolean");
      } else if (typeof value === "number") {
        push(find(JSON.stringify(value)), "number");
      } else if (typeof value === "string") {
        const direct = find(value);
        if (direct) {
          push(direct, "exact");
          continue;
        }
        const parts = value.includes("\n") ? lines(value) : [value];
        const traced = parts.map((part) => find(part) ?? findPart(part) ?? findPrototype(part));
        if (traced.every(Boolean)) push([...new Set(traced)].join(" + "), parts.length > 1 ? "per line" : traced[0]?.startsWith("prototype") ? "prototype literal" : "segment");
        else push(null, `untraced line(s): ${parts.filter((_, index) => !traced[index]).join(" | ").slice(0, 120)}`);
      } else {
        push(null, "unsupported value");
      }
    }
  }
  return rows;
}

async function main() {
  const entriesDir = path.join(repoRoot, "content/entries");
  const entries = [];
  for (const model of (await readdir(entriesDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
    for (const file of (await readdir(path.join(entriesDir, model))).filter((name) => name.endsWith(".json")).sort()) {
      entries.push(JSON.parse(await readFile(path.join(entriesDir, model, file), "utf8")));
    }
  }
  const content = JSON.parse(await readFile(path.join(repoRoot, "tests/fixtures/approved-seed/content.json"), "utf8"));
  const prototypeDir = argument("--prototype");
  const prototype = prototypeDir
    ? await Promise.all(["build.py", "components/ui.py", "site.js"].map(async (file) => ({ file, text: await readFile(path.join(prototypeDir, file), "utf8") })))
    : undefined;
  const rows = trace({ entries, content, prototype });
  const untraced = rows.filter((row) => row.source === null);
  const byHow = rows.reduce((counts, row) => counts.set(row.how.split(":")[0], (counts.get(row.how.split(":")[0]) ?? 0) + 1), new Map());
  const report = { entries: entries.length, values: rows.length, untraced: untraced.length, byHow: Object.fromEntries(byHow), rows };
  const reportPath = argument("--report");
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`trace-to-source: ${rows.length} values in ${entries.length} entries; ${JSON.stringify(report.byHow)}`);
  if (untraced.length > 0) {
    console.error(`trace-to-source: ${untraced.length} untraced value(s)${prototype ? "" : " (pass --prototype <seed>/prototype/src to trace the prototype's hard-coded copy)"}:\n${untraced.map((row) => `  - ${row.entry} ${row.field}: ${row.how}`).join("\n")}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
