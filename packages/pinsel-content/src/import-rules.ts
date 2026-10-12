// Contract for the seed importer (content-migration sub-issue) and the
// publication pipeline's "baseline advance". Types only plus one pure decision
// function; file IO stays in the importer.

export const CONTENT_ENTRIES_DIR = "content/entries";
export const CONTENT_BASELINE_PATH = "content/baseline.json";

/** `content/entries/<modelId>/<entryId>.json` — the only paths the publisher may write (plus `content/snapshot.json`). */
export function entryFilePath(modelId: string, entryId: string): string {
  return `${CONTENT_ENTRIES_DIR}/${modelId}/${entryId}.json`;
}

export const CONTENT_SNAPSHOT_PATH = "content/snapshot.json";

/** The only repository paths a publication may write: entry files and the snapshot record. */
export const PINSEL_PUBLISH_ALLOWLIST = [`${CONTENT_ENTRIES_DIR}/**`, CONTENT_SNAPSHOT_PATH] as const;

/** `content/snapshot.json` or `content/entries/<modelId>/<entryId>.json` with id-shaped segments; nothing else. */
export function isPublishablePath(path: string): boolean {
  if (path === CONTENT_SNAPSHOT_PATH) return true;
  return /^content\/entries\/[a-z0-9][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(path) && !path.includes("..");
}

export function baselineKey(modelId: string, entryId: string): string {
  return `${modelId}/${entryId}`;
}

/**
 * `sha256(canonicalStringifyJson(entry.values))` as lowercase hex. Only
 * `values` is digested: ids and timestamps are fixed by the import, and
 * lifecycle/generation belong to storage.
 */
export type ValuesDigest = string;

export interface ContentBaselineEntry {
  modelId: string;
  entryId: string;
  digest: ValuesDigest;
  /** Same digest over only the fields the server policy never lets the client write (`page-copy.route`, `nav-link.href`, `note.slug`, `course.order`, …). */
  protectedDigest: ValuesDigest;
}

export interface ContentBaseline {
  schemaVersion: 1;
  /** Content authority the seed was extracted from (read-only yuko-site PR). */
  source: { repository: string; pr: number; head: string };
  /** sha256 of the seed `content.json` the digests were derived from. */
  seedContentDigest: string;
  /** sha256 of the canonical `entries` map below: one digest for the whole imported set. */
  entriesDigest: string;
  /** ISO timestamp of the import run that last advanced this baseline. */
  importedAt: string;
  /** Keyed by `baselineKey(modelId, entryId)`. */
  entries: Record<string, ContentBaselineEntry>;
}

export type ImportDecision =
  /** No entry file yet: write it and record its digest. */
  | "create"
  /** File, baseline and seed agree: nothing to do. */
  | "unchanged"
  /** File still equals the baseline but the seed moved: write the seed value and advance the baseline. */
  | "update-from-seed"
  /** File differs from the baseline, i.e. the CMS edited it since the last import: never overwrite. */
  | "keep-newer";

export interface ImportDecisionInput {
  seedDigest: ValuesDigest;
  /** Digest recorded in `content/baseline.json`; `undefined` when the entry was never imported. */
  baselineDigest: ValuesDigest | undefined;
  /** Digest of the entry file on disk; `undefined` when the file is missing. */
  currentDigest: ValuesDigest | undefined;
}

/**
 * Idempotency: running the importer twice on the same seed yields `unchanged`
 * everywhere. Never-overwrite-newer: a file whose digest left the baseline is
 * a CMS edit and wins over the seed, even if the seed also changed.
 */
export function decideImport({ seedDigest, baselineDigest, currentDigest }: ImportDecisionInput): ImportDecision {
  if (currentDigest === undefined) return "create";
  if (baselineDigest !== undefined && currentDigest !== baselineDigest) return "keep-newer";
  if (baselineDigest === undefined && currentDigest !== seedDigest) return "keep-newer";
  return currentDigest === seedDigest ? "unchanged" : "update-from-seed";
}

/**
 * Entry id scheme (ids match Composer's `RECORD_ID_PATTERN` and are unique
 * per provider, not per model):
 * - singletons: the model id (`site-copy`, `lessons-copy`, ...)
 * - `page-copy`: `page-<route key>` (`page-home`, ..., `page-not-found`)
 * - `nav-link`: `nav-<route segment>` (`nav-lessons`, ..., `nav-contact`)
 * - `course`: `consultation` | `two-month` | `four-month`
 * - `result-year`: `year-<YYYY>`; `result-entry`: `<yearId>-<NN>` (1-based, 2 digits, seed row order)
 * - `note`: the slug; `knowledge-card`: `card-<slug>`
 * - `faq-group`: `faq-<key>` (exam | lessons | german | fees); `faq-item`: `<groupId>-<NN>`
 * - `testimonial`: `student-<NN>`; `home-voice`: `home-voice-<NN>`; `home-result`: `home-result-<NN>`; `home-faq`: `home-faq-<NN>`
 * - `timeline-entry`: `<timeline>-<NN>`; `target-item`: `<page>-<NN>`
 * - other ordered collections: `<modelId>-<NN>`
 * Entries the client creates later get `<modelId>-<ulid-like lowercase id>` from the host; ids are never reused.
 */
export function seedEntryId(prefix: string, index1: number): string {
  return `${prefix}-${String(index1).padStart(2, "0")}`;
}
