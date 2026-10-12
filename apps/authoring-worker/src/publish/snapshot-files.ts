import { CONTENT_SNAPSHOT_PATH, PINSEL_CONTENT_PROVIDER_ID, entryFilePath, isPublishablePath } from "@pinsel/content";
import type { JsonValue } from "@zudo-composer/component-contract";
import { canonicalStringifyJson } from "zudo-composer/content";
import type { ContentSnapshotRecord } from "zudo-composer/host-storage";
import type { ContentEntryRecord, SiteProject } from "zudo-composer/site-project";
import workerManifest from "../../package.json";
import { contentBranchFor, packageIdentityFromManifest, type PublicationPackageIdentity, type SnapshotRecordFile } from "./publication-record";

// What a Git publisher writes for one snapshot: `content/entries/**` and
// `content/snapshot.json`, nothing else. Only entries that differ from the
// baseline are written, and a rewritten file keeps the key order of the file
// it replaces, so a one-price edit is a one-line diff. New files use the
// importer's layout (record keys in schema order, values in model field order).

/** The identity this Worker build declares (its own package.json pins; CI checks the site's match). Throws if a pin is not exact. */
export function publicationPackageIdentity(): PublicationPackageIdentity {
  return packageIdentityFromManifest(workerManifest);
}

const RECORD_KEY_ORDER = ["schemaVersion", "id", "modelId", "createdAt", "updatedAt", "values", "lifecycle", "generation"] as const;

type Json = JsonValue;

function isObject(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `next` with object keys in `previous`'s order where both have them, new keys after (in `fallbackOrder` first, then as given). */
export function inKeyOrder(next: Json, previous: Json | undefined, fallbackOrder: readonly string[] = []): Json {
  if (Array.isArray(next)) return next.map((item, index) => inKeyOrder(item, Array.isArray(previous) ? previous[index] : undefined));
  if (!isObject(next)) return next;
  const before = isObject(previous) ? Object.keys(previous) : [];
  const keys = [...before, ...fallbackOrder, ...Object.keys(next)].filter((key, index, all) => key in next && all.indexOf(key) === index);
  const result: Record<string, Json> = {};
  for (const key of keys) result[key] = inKeyOrder(next[key]!, isObject(previous) ? previous[key] : undefined);
  return result;
}

function contentProvider(project: SiteProject) {
  return project.providers.content.find((provider) => provider.id === PINSEL_CONTENT_PROVIDER_ID);
}

function fieldOrder(project: SiteProject, modelId: string): string[] {
  const model = contentProvider(project)?.models.find((candidate) => candidate.id === modelId);
  return (model?.document.fields ?? []).map((field) => field.id);
}

/** One entry file: two-space JSON plus newline, keys ordered after the file it replaces (if any). */
export function serializeEntryFile(entry: ContentEntryRecord, project: SiteProject, previous?: Json): string {
  const values = inKeyOrder(entry.values as Json, isObject(previous) ? previous.values : undefined, fieldOrder(project, entry.modelId));
  return `${JSON.stringify(inKeyOrder({ ...(entry as unknown as Record<string, Json>), values }, previous, RECORD_KEY_ORDER), null, 2)}\n`;
}

export interface PlannedEntryWrite {
  readonly path: string;
  readonly entry: ContentEntryRecord;
  /** The baseline has this entry, so the file exists at the base commit and its key order is reused. */
  readonly existed: boolean;
}

export interface PublicationPlan {
  readonly branch: string;
  readonly writes: readonly PlannedEntryWrite[];
  readonly deletes: readonly string[];
  readonly record: SnapshotRecordFile;
}

/**
 * The entry files that change between `baselineProject` and the snapshot,
 * plus the snapshot record. Without a baseline every entry is written. Throws
 * if any path would leave the publish allowlist (never expected: ids are
 * validated record ids).
 */
export function planPublication(input: { snapshot: ContentSnapshotRecord; baselineProject?: SiteProject; packageIdentity: PublicationPackageIdentity; requestedBy: string; requestedAt: string }): PublicationPlan {
  const { snapshot } = input;
  const entries = contentProvider(snapshot.project)?.entries ?? [];
  const before = new Map((input.baselineProject ? (contentProvider(input.baselineProject)?.entries ?? []) : []).map((entry) => [entryFilePath(entry.modelId, entry.id), entry]));
  const writes: PlannedEntryWrite[] = [];
  for (const entry of entries) {
    const path = entryFilePath(entry.modelId, entry.id);
    const previous = before.get(path);
    if (previous && canonicalStringifyJson(previous as unknown as Json) === canonicalStringifyJson(entry as unknown as Json)) continue;
    writes.push({ path, entry, existed: previous !== undefined });
  }
  const kept = new Set(entries.map((entry) => entryFilePath(entry.modelId, entry.id)));
  const deletes = [...before.keys()].filter((path) => !kept.has(path));
  for (const path of [...writes.map((write) => write.path), ...deletes]) if (!isPublishablePath(path)) throw new Error(`${path} is outside the publish allowlist.`);
  const record: SnapshotRecordFile = { snapshotId: snapshot.snapshotId, baselineGitSha: snapshot.baselineRevision, contentDigest: snapshot.snapshotId, packageIdentity: input.packageIdentity, requestedBy: input.requestedBy, requestedAt: input.requestedAt };
  return { branch: contentBranchFor(snapshot.snapshotId), writes, deletes, record };
}

export function commitMessageFor(plan: PublicationPlan): string {
  const { record } = plan;
  return [
    `content: publish snapshot ${record.snapshotId.slice(0, 12)}`,
    "",
    `${plan.writes.length} entr${plan.writes.length === 1 ? "y" : "ies"} written, ${plan.deletes.length} removed, plus ${CONTENT_SNAPSHOT_PATH}.`,
    "",
    `Pinsel-Snapshot: ${record.snapshotId}`,
    `Pinsel-Baseline: ${record.baselineGitSha}`,
    `Pinsel-Requested-By: ${record.requestedBy}`,
  ].join("\n");
}

export function pullRequestTitleFor(plan: PublicationPlan): string {
  return `content: publish snapshot ${plan.record.snapshotId.slice(0, 12)}`;
}

export function pullRequestBodyFor(plan: PublicationPlan, policy: "manual" | "auto"): string {
  const { record } = plan;
  const changed = [...plan.writes.map((write) => `- \`${write.path}\`${write.existed ? "" : " (new)"}`), ...plan.deletes.map((path) => `- \`${path}\` (removed)`)];
  return [
    "Content-only publication from the Pinsel authoring Worker. Only `content/entries/**` and `content/snapshot.json` may change; the `content-validate` workflow fails otherwise.",
    "",
    "| Identity | Value |",
    "| --- | --- |",
    `| Snapshot | \`${record.snapshotId}\` |`,
    `| Content digest | \`${record.contentDigest}\` |`,
    `| Baseline commit | \`${record.baselineGitSha}\` |`,
    `| zfb | ${record.packageIdentity.zfb} |`,
    `| zudo-composer | \`${record.packageIdentity.composerSha}\` |`,
    `| component-contract | \`${record.packageIdentity.contractSha}\` |`,
    `| Requested by | ${record.requestedBy} at ${record.requestedAt} |`,
    "",
    policy === "auto" ? "Promotion policy `auto`: the Worker merges this PR after every required check passed." : "Promotion policy `manual`: a maintainer reviews and merges this PR.",
    "",
    "Changed entries:",
    "",
    ...(changed.length > 0 ? changed : ["- none (snapshot record only)"]),
  ].join("\n");
}
