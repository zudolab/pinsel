import { ContentPersistenceError, assertContentEntryMatchesModel, type ContentMutation, type ContentSnapshot } from "zudo-composer/content";
import {
  contentDraftRequestDigest,
  contentSnapshotId,
  projectWithContentSnapshot,
  type ContentBaseline,
  type ContentDraftApplied,
  type ContentDraftConflictReason,
  type ContentDraftMutationResult,
  type ContentDraftReadResult,
  type ContentDraftState,
  type ContentDraftStorageAdapter,
  type ContentOperationReceipt,
  type ContentSnapshotRecord,
} from "zudo-composer/host-storage";
import type { ContentEntryRecord, ContentModelRecord, SiteProject } from "zudo-composer/site-project";

// `ContentDraftStorageAdapter` on D1. D1 has no BEGIN/COMMIT; the only
// transaction is `db.batch()`. Every write is therefore ONE batch whose first
// statement inserts a token row only when the precondition holds (expected
// draft/baseline revision, unused operation id) and whose every later
// statement is gated on that token row existing. A losing precondition writes
// nothing; the result is derived by reading the token row back, never from
// `meta.changes`. The per-adapter queue below only orders calls inside one
// isolate for deterministic tests; the SQL gates are the correctness mechanism.

export interface D1ContentDraftStorageOptions {
  projectId: string;
  now?: () => string;
}

interface StateRow {
  draft_revision: number;
  baseline_revision: string;
  project_json: string;
}

interface OperationRow {
  attempt_token: string;
  request_digest: string;
  actor_subject: string;
  receipt_json: string;
}

interface SnapshotRow {
  snapshot_id: string;
  draft_revision: number;
  baseline_revision: string;
  project_json: string;
  created_at: string;
}

const PROVIDER_ID = "content-filesystem";

function contentProvider(project: SiteProject) {
  const provider = project.providers.content.find((candidate) => candidate.id === PROVIDER_ID);
  if (!provider) throw new Error(`Project has no Content provider "${PROVIDER_ID}".`);
  return provider;
}

function affectedEntryIds(mutation: ContentMutation): string[] {
  const ids = new Set<string>();
  for (const operation of mutation.operations) {
    if (operation.kind === "put-entry") ids.add(operation.record.id);
    else if (operation.kind === "delete-entry" || operation.kind === "unpublish-entry") ids.add(operation.id);
  }
  return [...ids].sort();
}

interface PlannedWrite {
  upserts: ContentEntryRecord[];
  deletes: string[];
  entries: ContentEntryRecord[];
}

/** Mirrors the Content store's `transact` rules for the operations the restricted role can produce. */
function planMutation(mutation: ContentMutation, models: readonly ContentModelRecord[], current: readonly ContentEntryRecord[], nextRevision: number): PlannedWrite {
  let entries = [...current];
  const upserts = new Map<string, ContentEntryRecord>();
  const deletes = new Set<string>();
  const model = (id: string): ContentModelRecord => {
    const found = models.find((candidate) => candidate.id === id);
    if (!found) throw new ContentPersistenceError("transact", "not-found", "Content model was not found.", false);
    return found;
  };
  for (const operation of mutation.operations) {
    switch (operation.kind) {
      case "put-entry": {
        const record = operation.record;
        const definition = model(record.modelId);
        assertContentEntryMatchesModel(record, definition, "put-entry");
        const old = entries.find((entry) => entry.id === record.id);
        if (old && (old.modelId !== record.modelId || old.createdAt !== record.createdAt)) {
          throw new ContentPersistenceError("transact", "validation", "Entry identity and creation time are immutable.", false);
        }
        if (definition.document.kind === "single" && !old && entries.some((entry) => entry.modelId === record.modelId)) {
          throw new ContentPersistenceError("transact", "single-cardinality", "A Single model permits at most one Entry.", false);
        }
        const stored: ContentEntryRecord = { ...record, lifecycle: old?.lifecycle ?? record.lifecycle };
        const next = old && JSON.stringify(old) === JSON.stringify(stored) ? old : { ...stored, generation: nextRevision };
        entries = old ? entries.map((entry) => (entry.id === record.id ? next : entry)) : [...entries, next];
        if (next !== old) upserts.set(record.id, next);
        deletes.delete(record.id);
        break;
      }
      case "delete-entry":
        entries = entries.filter((entry) => entry.id !== operation.id);
        upserts.delete(operation.id);
        deletes.add(operation.id);
        break;
      case "unpublish-entry": {
        const old = entries.find((entry) => entry.id === operation.id);
        if (!old) throw new ContentPersistenceError("transact", "not-found", "Content Entry was not found.", false);
        const next: ContentEntryRecord = { ...old, lifecycle: "draft", generation: nextRevision };
        entries = entries.map((entry) => (entry.id === operation.id ? next : entry));
        upserts.set(operation.id, next);
        break;
      }
      default:
        throw new ContentPersistenceError("transact", "unsupported-transaction", `The hosted draft store does not accept ${operation.kind}.`, false);
    }
  }
  return { upserts: [...upserts.values()], deletes: [...deletes], entries };
}

/** Clears every table: tests only. The Worker never calls this. */
export async function resetD1ContentDraftStorage(db: D1Database): Promise<void> {
  await db.batch(["baseline", "draft_state", "draft_entries", "operations", "revisions", "snapshots", "baseline_advances"].map((table) => db.prepare(`DELETE FROM ${table}`)));
}

/** Seeds the baseline and a clean draft once; a second call is a no-op. */
export async function seedD1ContentDraftStorage(db: D1Database, baseline: ContentBaseline, options: D1ContentDraftStorageOptions): Promise<boolean> {
  const now = options.now?.() ?? new Date().toISOString();
  const provider = contentProvider(baseline.project);
  const existing = await db.prepare("SELECT project_id FROM baseline WHERE project_id = ?").bind(options.projectId).first<{ project_id: string }>();
  if (existing) return false;
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO baseline (project_id, baseline_revision, project_json, advanced_at) VALUES (?, ?, ?, ?)").bind(options.projectId, baseline.baselineRevision, JSON.stringify(baseline.project), now),
    db.prepare("INSERT OR IGNORE INTO draft_state (project_id, draft_revision, baseline_revision, updated_at) SELECT ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM baseline WHERE project_id = ? AND advanced_at = ?)").bind(options.projectId, baseline.baselineRevision, now, options.projectId, now),
    db.prepare("INSERT OR IGNORE INTO revisions (project_id, draft_revision, kind, operation_id, created_at) SELECT ?, 1, 'seed', NULL, ? WHERE EXISTS (SELECT 1 FROM baseline WHERE project_id = ? AND advanced_at = ?)").bind(options.projectId, now, options.projectId, now),
    ...provider.entries.map((entry, index) =>
      db.prepare("INSERT OR IGNORE INTO draft_entries (project_id, entry_id, model_id, position, record_json) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM baseline WHERE project_id = ? AND advanced_at = ?)").bind(options.projectId, entry.id, entry.modelId, index, JSON.stringify(entry), options.projectId, now),
    ),
  ]);
  return true;
}

export function createD1ContentDraftStorage(db: D1Database, options: D1ContentDraftStorageOptions): ContentDraftStorageAdapter {
  const projectId = options.projectId;
  const now = options.now ?? (() => new Date().toISOString());
  let queue: Promise<unknown> = Promise.resolve();
  const serialized = <T>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work);
    queue = result.catch(() => undefined);
    return result;
  };

  const readState = async (): Promise<{ state: StateRow; entries: ContentEntryRecord[]; project: SiteProject } | null> => {
    const [stateResult, entryResult] = await db.batch<StateRow | { record_json: string }>([
      db.prepare("SELECT ds.draft_revision, ds.baseline_revision, b.project_json FROM draft_state ds JOIN baseline b ON b.project_id = ds.project_id WHERE ds.project_id = ?").bind(projectId),
      db.prepare("SELECT record_json FROM draft_entries WHERE project_id = ? ORDER BY position, entry_id").bind(projectId),
    ]);
    const state = stateResult?.results[0] as StateRow | undefined;
    if (!state) return null;
    const entries = (entryResult?.results as { record_json: string }[]).map((row) => JSON.parse(row.record_json) as ContentEntryRecord);
    return { state, entries, project: JSON.parse(state.project_json) as SiteProject };
  };

  const draftOf = (read: NonNullable<Awaited<ReturnType<typeof readState>>>): ContentDraftState => ({
    snapshot: { providerId: PROVIDER_ID, mutationToken: read.state.draft_revision, models: contentProvider(read.project).models, entries: read.entries },
    draftRevision: read.state.draft_revision,
    baselineRevision: read.state.baseline_revision,
  });

  const readDraft = async (): Promise<ContentDraftReadResult<ContentDraftState>> => {
    const read = await readState();
    return read ? { status: "ok", value: draftOf(read) } : { status: "not-found" };
  };

  const conflict = async (reason: ContentDraftConflictReason): Promise<ContentDraftMutationResult<never>> => {
    const read = await readState();
    if (!read) return { status: "unavailable", message: "The draft is not seeded." };
    return { status: "conflict", reason, current: { draftRevision: read.state.draft_revision, baselineRevision: read.state.baseline_revision } };
  };

  const readOperation = (operationId: string) =>
    db.prepare("SELECT attempt_token, request_digest, actor_subject, receipt_json FROM operations WHERE operation_id = ? AND project_id = ?").bind(operationId, projectId).first<OperationRow>();

  const snapshotRecord = (row: SnapshotRow): ContentSnapshotRecord => ({
    snapshotId: row.snapshot_id,
    project: JSON.parse(row.project_json) as SiteProject,
    draftRevision: row.draft_revision,
    baselineRevision: row.baseline_revision,
    createdAt: row.created_at,
  });

  const readSnapshotRow = (snapshotId: string) =>
    db.prepare("SELECT snapshot_id, draft_revision, baseline_revision, project_json, created_at FROM snapshots WHERE snapshot_id = ? AND project_id = ?").bind(snapshotId, projectId).first<SnapshotRow>();

  return {
    async readBaseline() {
      const row = await db.prepare("SELECT baseline_revision, project_json FROM baseline WHERE project_id = ?").bind(projectId).first<{ baseline_revision: string; project_json: string }>();
      return row ? { status: "ok", value: { project: JSON.parse(row.project_json) as SiteProject, baselineRevision: row.baseline_revision } } : { status: "not-found" };
    },

    readDraft() {
      return serialized(readDraft);
    },

    apply(input) {
      return serialized(async (): Promise<ContentDraftMutationResult<ContentDraftApplied>> => {
        const requestDigest = input.requestDigest ?? (await contentDraftRequestDigest(input));
        const prior = await readOperation(input.operationId);
        if (prior) {
          if (prior.request_digest !== requestDigest) return conflict("operation-id");
          const draft = await readDraft();
          if (draft.status !== "ok") return { status: "unavailable", message: "The draft could not be read." };
          return { status: "ok", value: { receipt: JSON.parse(prior.receipt_json) as ContentOperationReceipt, draft: draft.value, replayed: true } };
        }
        const read = await readState();
        if (!read) return { status: "unavailable", message: "The draft is not seeded." };
        if (input.expectedBaselineRevision !== read.state.baseline_revision) return conflict("baseline-revision");
        if (input.expectedDraftRevision !== read.state.draft_revision || input.mutation.expectedMutationToken !== read.state.draft_revision) return conflict("draft-revision");

        const nextRevision = read.state.draft_revision + 1;
        let planned: PlannedWrite;
        try {
          planned = planMutation(input.mutation, contentProvider(read.project).models, read.entries, nextRevision);
        } catch (error) {
          if (error instanceof ContentPersistenceError) return { status: "rejected", code: error.code, message: error.message };
          return { status: "rejected", code: "validation", message: error instanceof Error ? error.message : String(error) };
        }
        const appliedAt = now();
        const receipt: ContentOperationReceipt = {
          operationId: input.operationId,
          actor: { subject: input.actor.subject },
          appliedAt,
          previousDraftRevision: read.state.draft_revision,
          draftRevision: nextRevision,
          baselineRevision: read.state.baseline_revision,
          requestDigest,
          affectedEntryIds: affectedEntryIds(input.mutation),
        };
        const attempt = crypto.randomUUID();
        const gate = "EXISTS (SELECT 1 FROM operations WHERE operation_id = ? AND attempt_token = ?)";
        const positionBase = read.entries.length;
        try {
          await db.batch([
            db.prepare(
              "INSERT INTO operations (operation_id, project_id, attempt_token, actor_subject, request_digest, receipt_json, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM draft_state WHERE project_id = ? AND draft_revision = ? AND baseline_revision = ?) AND NOT EXISTS (SELECT 1 FROM operations WHERE operation_id = ?)",
            ).bind(input.operationId, projectId, attempt, input.actor.subject, requestDigest, JSON.stringify(receipt), appliedAt, projectId, input.expectedDraftRevision, input.expectedBaselineRevision, input.operationId),
            db.prepare(`UPDATE draft_state SET draft_revision = ?, updated_at = ? WHERE project_id = ? AND ${gate}`).bind(nextRevision, appliedAt, projectId, input.operationId, attempt),
            db.prepare(`INSERT INTO revisions (project_id, draft_revision, kind, operation_id, created_at) SELECT ?, ?, 'apply', ?, ? WHERE ${gate}`).bind(projectId, nextRevision, input.operationId, appliedAt, input.operationId, attempt),
            ...planned.upserts.map((record, index) =>
              db.prepare(
                `INSERT INTO draft_entries (project_id, entry_id, model_id, position, record_json) SELECT ?, ?, ?, ?, ? WHERE ${gate} ON CONFLICT (project_id, entry_id) DO UPDATE SET model_id = excluded.model_id, record_json = excluded.record_json`,
              ).bind(projectId, record.id, record.modelId, positionBase + index, JSON.stringify(record), input.operationId, attempt),
            ),
            ...planned.deletes.map((entryId) => db.prepare(`DELETE FROM draft_entries WHERE project_id = ? AND entry_id = ? AND ${gate}`).bind(projectId, entryId, input.operationId, attempt)),
          ]);
        } catch (error) {
          return { status: "uncertain", message: error instanceof Error ? error.message : String(error), operationId: input.operationId };
        }
        const written = await readOperation(input.operationId);
        if (!written) {
          const current = await readState();
          if (!current) return { status: "unavailable", message: "The draft is not seeded." };
          const reason: ContentDraftConflictReason = current.state.baseline_revision !== input.expectedBaselineRevision ? "baseline-revision" : "draft-revision";
          return { status: "conflict", reason, current: { draftRevision: current.state.draft_revision, baselineRevision: current.state.baseline_revision } };
        }
        const draft = await readDraft();
        if (draft.status !== "ok") return { status: "unavailable", message: "The draft could not be read." };
        if (written.attempt_token !== attempt) {
          if (written.request_digest !== requestDigest) return { status: "conflict", reason: "operation-id", current: { draftRevision: draft.value.draftRevision, baselineRevision: draft.value.baselineRevision } };
          return { status: "ok", value: { receipt: JSON.parse(written.receipt_json) as ContentOperationReceipt, draft: draft.value, replayed: true } };
        }
        return { status: "ok", value: { receipt, draft: draft.value, replayed: false } };
      });
    },

    async readReceipt(operationId) {
      const row = await readOperation(operationId);
      return row ? { status: "ok", value: JSON.parse(row.receipt_json) as ContentOperationReceipt } : { status: "not-found" };
    },

    snapshot(input) {
      return serialized(async (): Promise<ContentDraftMutationResult<ContentSnapshotRecord>> => {
        const read = await readState();
        if (!read) return { status: "unavailable", message: "The draft is not seeded." };
        if (input.expectedDraftRevision !== read.state.draft_revision) return conflict("draft-revision");
        const project = projectWithContentSnapshot(read.project, draftOf(read).snapshot);
        const snapshotId = await contentSnapshotId(project);
        const createdAt = now();
        try {
          await db.batch([
            db.prepare(
              "INSERT OR IGNORE INTO snapshots (snapshot_id, project_id, draft_revision, baseline_revision, project_json, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM draft_state WHERE project_id = ? AND draft_revision = ?)",
            ).bind(snapshotId, projectId, read.state.draft_revision, read.state.baseline_revision, JSON.stringify(project), createdAt, projectId, input.expectedDraftRevision),
          ]);
        } catch (error) {
          return { status: "unavailable", message: error instanceof Error ? error.message : String(error) };
        }
        const row = await readSnapshotRow(snapshotId);
        return row ? { status: "ok", value: snapshotRecord(row) } : conflict("draft-revision");
      });
    },

    async readSnapshot(snapshotId) {
      const row = await readSnapshotRow(snapshotId);
      return row ? { status: "ok", value: snapshotRecord(row) } : { status: "not-found" };
    },

    advanceBaseline(input) {
      return serialized(async (): Promise<ContentDraftMutationResult<ContentDraftState>> => {
        const read = await readState();
        if (!read) return { status: "unavailable", message: "The draft is not seeded." };
        if (input.expectedBaselineRevision !== read.state.baseline_revision) return conflict("baseline-revision");
        const integrated = await readSnapshotRow(input.integratedSnapshotId);
        if (!integrated) return { status: "not-found" };
        const provider = input.baseline.project.providers.content.find((candidate) => candidate.id === PROVIDER_ID);
        if (!provider) return { status: "rejected", code: "validation", message: `Baseline project has no Content provider "${PROVIDER_ID}".` };
        const token = crypto.randomUUID();
        const at = now();
        const gate = "EXISTS (SELECT 1 FROM baseline_advances WHERE advance_token = ?)";
        // A draft still at the integrated snapshot's revision is rebuilt from the
        // new baseline; the check runs inside the batch, before the revision moves,
        // so a save that landed meanwhile keeps its entries.
        const clean = `${gate} AND (SELECT draft_revision FROM draft_state WHERE project_id = ?) = ?`;
        try {
          await db.batch([
            db.prepare(
              "INSERT INTO baseline_advances (advance_token, project_id, from_baseline, to_baseline, integrated_snapshot_id, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM draft_state WHERE project_id = ? AND baseline_revision = ?)",
            ).bind(token, projectId, input.expectedBaselineRevision, input.baseline.baselineRevision, input.integratedSnapshotId, at, projectId, input.expectedBaselineRevision),
            db.prepare(`DELETE FROM draft_entries WHERE project_id = ? AND ${clean}`).bind(projectId, token, projectId, integrated.draft_revision),
            ...provider.entries.map((entry, index) =>
              db.prepare(`INSERT INTO draft_entries (project_id, entry_id, model_id, position, record_json) SELECT ?, ?, ?, ?, ? WHERE ${clean}`).bind(projectId, entry.id, entry.modelId, index, JSON.stringify(entry), token, projectId, integrated.draft_revision),
            ),
            db.prepare(`UPDATE baseline SET baseline_revision = ?, project_json = ?, advanced_at = ? WHERE project_id = ? AND ${gate}`).bind(input.baseline.baselineRevision, JSON.stringify(input.baseline.project), at, projectId, token),
            db.prepare(`INSERT INTO revisions (project_id, draft_revision, kind, operation_id, created_at) SELECT ?, draft_revision + 1, 'advance', NULL, ? FROM draft_state WHERE project_id = ? AND ${gate}`).bind(projectId, at, projectId, token),
            db.prepare(`UPDATE draft_state SET draft_revision = draft_revision + 1, baseline_revision = ?, updated_at = ? WHERE project_id = ? AND ${gate}`).bind(input.baseline.baselineRevision, at, projectId, token),
          ]);
        } catch (error) {
          return { status: "unavailable", message: error instanceof Error ? error.message : String(error) };
        }
        const advanced = await db.prepare("SELECT advance_token FROM baseline_advances WHERE advance_token = ?").bind(token).first<{ advance_token: string }>();
        if (!advanced) return conflict("baseline-revision");
        const draft = await readDraft();
        return draft.status === "ok" ? draft : { status: "unavailable", message: "The draft could not be read." };
      });
    },
  };
}

export type { ContentBaseline, ContentDraftStorageAdapter, ContentSnapshot };
