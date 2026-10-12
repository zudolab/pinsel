import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { JsonValue } from "@zudo-composer/component-contract";
import { canonicalStringifyJson, validateContentEntryRecord } from "zudo-composer/content";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import {
  CONTENT_BASELINE_PATH,
  baselineKey,
  decideImport,
  entryFilePath,
  type ContentBaseline,
  type ContentBaselineEntry,
  type ImportDecision,
} from "../import-rules";
import { PINSEL_MODELS, modelById } from "../models";
import { PINSEL_CONTENT_POLICY } from "../policy";
import { FIXTURE_DIR, buildSeedEntries } from "./seed-entries";

export const DEFAULT_IMPORT_ROOT = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** `sha256(canonicalStringifyJson(values))`, the import-rules `ValuesDigest`. */
export function valuesDigest(values: ContentEntryRecord["values"]): string {
  return sha256(canonicalStringifyJson(values as JsonValue));
}

/** Values of the fields the server policy never lets the client write (route, href, slug, `order` where `reorder` is not allowed, …). */
export function protectedValues(entry: Pick<ContentEntryRecord, "modelId" | "values">): Record<string, JsonValue> {
  const model = modelById(entry.modelId);
  if (!model) throw new Error(`Unknown model ${entry.modelId}`);
  const writable = new Set(PINSEL_CONTENT_POLICY.models[entry.modelId]?.fields ?? []);
  const result: Record<string, JsonValue> = {};
  for (const field of model.document.fields) {
    if (!writable.has(field.id) && field.id in entry.values) result[field.id] = entry.values[field.id] as JsonValue;
  }
  return result;
}

export function protectedDigest(entry: Pick<ContentEntryRecord, "modelId" | "values">): string {
  return sha256(canonicalStringifyJson(protectedValues(entry)));
}

/** One file per entry: two-space JSON in record key order plus a trailing newline (the Gate-1 `course` files' format). */
export function serializeEntry(entry: ContentEntryRecord): string {
  return `${JSON.stringify(entry, null, 2)}\n`;
}

export function baselineEntryFor(entry: ContentEntryRecord): ContentBaselineEntry {
  return { modelId: entry.modelId, entryId: entry.id, digest: valuesDigest(entry.values), protectedDigest: protectedDigest(entry) };
}

export interface ImportRow {
  key: string;
  modelId: string;
  entryId: string;
  decision: ImportDecision;
}

export interface ImportResult {
  rows: ImportRow[];
  baseline: ContentBaseline;
  /** Repository-relative paths written by this run (entries and/or the baseline). */
  written: string[];
}

export interface ImportOptions {
  /** Repository root that holds `content/`. Tests pass a temporary copy. */
  root?: string;
  /** Timestamp recorded as `importedAt` when the baseline moves. */
  now?: () => string;
}

interface SeedSource {
  source: { repository: string; pr: number; head: string };
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function readEntryFile(path: string): Promise<ContentEntryRecord | undefined> {
  const text = await readOptional(path);
  if (text === undefined) return undefined;
  const validated = validateContentEntryRecord(JSON.parse(text));
  if (!validated.ok) throw new Error(`${path}: ${validated.issue.path} ${validated.issue.message}`);
  return validated.value;
}

/**
 * Applies `decideImport` to every seed entry. Never writes over an entry whose
 * digest left the baseline (a CMS edit), and makes no write at all when
 * everything is already imported.
 */
export async function importSeed(options: ImportOptions = {}): Promise<ImportResult> {
  const root = options.root ?? DEFAULT_IMPORT_ROOT;
  const seedText = await readFile(join(FIXTURE_DIR, "content.json"), "utf8");
  const seed = JSON.parse(seedText) as SeedSource;
  const baselinePath = join(root, CONTENT_BASELINE_PATH);
  const baselineText = await readOptional(baselinePath);
  const previous = baselineText === undefined ? undefined : (JSON.parse(baselineText) as ContentBaseline);

  const rows: ImportRow[] = [];
  const written: string[] = [];
  const entries: Record<string, ContentBaselineEntry> = {};
  for (const entry of buildSeedEntries(PINSEL_MODELS)) {
    const key = baselineKey(entry.modelId, entry.id);
    const relative = entryFilePath(entry.modelId, entry.id);
    const current = await readEntryFile(join(root, relative));
    const recorded = previous?.entries[key];
    const seedEntry = baselineEntryFor(entry);
    const decision = decideImport({ seedDigest: seedEntry.digest, baselineDigest: recorded?.digest, currentDigest: current && valuesDigest(current.values) });
    rows.push({ key, modelId: entry.modelId, entryId: entry.id, decision });
    if (decision === "create" || decision === "update-from-seed") {
      await mkdir(dirname(join(root, relative)), { recursive: true });
      await writeFile(join(root, relative), serializeEntry(entry));
      written.push(relative);
    }
    entries[key] = decision === "keep-newer" ? (recorded ?? seedEntry) : seedEntry;
  }

  const sortedEntries = Object.fromEntries(Object.keys(entries).sort().map((key) => [key, entries[key]!]));
  const content = {
    schemaVersion: 1 as const,
    source: { repository: seed.source.repository, pr: seed.source.pr, head: seed.source.head },
    seedContentDigest: sha256(seedText),
    entriesDigest: sha256(canonicalStringifyJson(sortedEntries as unknown as JsonValue)),
  };
  const unchanged =
    previous !== undefined &&
    canonicalStringifyJson({ ...content, entries: sortedEntries } as unknown as JsonValue) ===
      canonicalStringifyJson({ schemaVersion: previous.schemaVersion, source: previous.source, seedContentDigest: previous.seedContentDigest, entriesDigest: previous.entriesDigest, entries: previous.entries } as unknown as JsonValue);
  const baseline: ContentBaseline = {
    ...content,
    importedAt: unchanged ? previous.importedAt : (options.now ?? (() => new Date().toISOString()))(),
    entries: sortedEntries,
  };
  if (!unchanged) {
    await mkdir(dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    written.push(CONTENT_BASELINE_PATH);
  }
  return { rows, baseline, written };
}
