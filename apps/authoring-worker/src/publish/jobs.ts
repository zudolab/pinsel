import type { HostContentActor } from "zudo-composer/content";
import type { ContentExportPackageIdentity, ContentExportSubmission } from "zudo-composer/export";
import type { ContentDraftStorageAdapter, ContentSnapshotRecord } from "zudo-composer/host-storage";
import { TERMINAL_PUBLICATION_STATES, publicationStateFor, type ProviderRef, type PublicationEvidence, type PublicationProviderPort, type PublisherSelection, type PublicationState, type StoredPublicationState } from "./port";

// Publication jobs in D1 and the on-demand provider refresh. One job per
// immutable snapshot (UNIQUE (project_id, snapshot_id)); every change is a
// compare-and-set on `version` whose winner is read back by `update_token`.
// The provider is only ever asked to submit the snapshot under the job's
// deterministic idempotency key, and after the first attempt it is first asked
// whether the submission already exists, so a lost acknowledgement or a
// restart never creates a second submission. The reconciliation loop
// (src/publish/reconcile.ts) serializes `observeJob` per job and adds promotion
// and the baseline advance on top.
//
// Recovery policy: a `failed` job is re-armed when the same snapshot is
// requested again (its base unchanged): it goes back to `submitted` and is
// re-delivered through lookup first, so the provider reuses the branch and only
// opens a new PR when the old one was closed. `conflict` stays terminal: the
// base moved or the provider's copy changed, so the editor snapshots again.

interface JobRow {
  job_id: string;
  snapshot_id: string;
  baseline_revision: string;
  idempotency_key: string;
  provider_id: string;
  state: StoredPublicationState;
  provider_ref_json: string | null;
  evidence_json: string | null;
  message: string | null;
  attempts: number;
  version: number;
  update_token: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
  lease_token: string | null;
  lease_expires_at: string | null;
  reconcile_attempts: number;
  provider_failures: number;
}

export interface PublicationView {
  publicationId: string;
  snapshotId: string;
  /** The integrated base the snapshot was frozen against. */
  baselineRevision: string;
  state: PublicationState;
  /** Set when `state` is `configuration-required`: what was last observed before the provider became unavailable. */
  lastObservedState?: StoredPublicationState;
  providerId: string;
  providerRef: ProviderRef | null;
  evidence: PublicationEvidence | null;
  message: string | null;
  /** Submissions handed to the provider (lookups included). */
  attempts: number;
  /** Provider status observations made for this job. */
  reconcileAttempts: number;
  /** Consecutive provider timeouts / unavailable answers; 0 after any answer. */
  providerFailures: number;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicationResult =
  | { status: "ok"; value: PublicationView; replayed?: boolean }
  | { status: "not-found"; message?: string }
  | { status: "conflict"; reason: "baseline-revision" | "package-identity" | "operation-id"; current: { baselineRevision: string }; message: string; value?: PublicationView }
  | { status: "rejected"; code: string; message: string; path?: string; value?: PublicationView }
  /** The job is durable but the provider's answer is unknown; `GET /publications/:id` recovers it. */
  | { status: "uncertain"; operationId: string; message: string; value: PublicationView }
  | { status: "unavailable"; code?: "configuration-required"; state?: "configuration-required"; message: string };

export interface PublicationContext {
  db: D1Database;
  projectId: string;
  adapter: ContentDraftStorageAdapter;
  actor: HostContentActor;
  publisher: PublisherSelection;
  packageIdentity: ContentExportPackageIdentity;
  now?: () => string;
}

const COLUMNS = "job_id, snapshot_id, baseline_revision, idempotency_key, provider_id, state, provider_ref_json, evidence_json, message, attempts, version, update_token, requested_by, created_at, updated_at, lease_token, lease_expires_at, reconcile_attempts, provider_failures";

/** Deterministic per snapshot, and a valid upstream idempotency key (short, no separators). */
export function publicationIdFor(snapshotId: string): string {
  return `pub-${snapshotId.slice(0, 32)}`;
}

export function view(row: JobRow): PublicationView {
  return {
    publicationId: row.job_id,
    snapshotId: row.snapshot_id,
    baselineRevision: row.baseline_revision,
    state: row.state,
    providerId: row.provider_id,
    providerRef: row.provider_ref_json ? (JSON.parse(row.provider_ref_json) as ProviderRef) : null,
    evidence: row.evidence_json ? (JSON.parse(row.evidence_json) as PublicationEvidence) : null,
    message: row.message,
    attempts: row.attempts,
    reconcileAttempts: row.reconcile_attempts,
    providerFailures: row.provider_failures,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type { JobRow };

export function readJob(db: D1Database, projectId: string, jobId: string): Promise<JobRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM jobs WHERE job_id = ? AND project_id = ?`).bind(jobId, projectId).first<JobRow>();
}

export async function readPublicationView(db: D1Database, projectId: string, jobId: string): Promise<PublicationView | null> {
  const row = await readJob(db, projectId, jobId);
  return row ? view(row) : null;
}

interface JobPatch {
  state?: StoredPublicationState;
  providerRef?: ProviderRef | null;
  evidence?: PublicationEvidence | null;
  message?: string | null;
  attempts?: number;
  reconcileAttempts?: number;
  providerFailures?: number;
}

/** One CAS on `version`. Returns the row after the attempt and whether this call wrote it. */
export async function casJob(db: D1Database, projectId: string, row: JobRow, patch: JobPatch, now: string): Promise<{ won: boolean; row: JobRow }> {
  const token = crypto.randomUUID();
  const providerRef = patch.providerRef === undefined ? row.provider_ref_json : patch.providerRef === null ? null : JSON.stringify(patch.providerRef);
  const evidence = patch.evidence === undefined ? row.evidence_json : patch.evidence === null ? null : JSON.stringify(patch.evidence);
  await db
    .prepare("UPDATE jobs SET state = ?, provider_ref_json = ?, evidence_json = ?, message = ?, attempts = ?, reconcile_attempts = ?, provider_failures = ?, version = version + 1, update_token = ?, updated_at = ? WHERE job_id = ? AND project_id = ? AND version = ?")
    .bind(patch.state ?? row.state, providerRef, evidence, patch.message === undefined ? row.message : patch.message, patch.attempts ?? row.attempts, patch.reconcileAttempts ?? row.reconcile_attempts, patch.providerFailures ?? row.provider_failures, token, now, row.job_id, projectId, row.version)
    .run();
  const after = await readJob(db, projectId, row.job_id);
  if (!after) throw new Error(`Job ${row.job_id} disappeared.`);
  return { won: after.update_token === token, row: after };
}

function submissionFor(job: JobRow, snapshot: ContentSnapshotRecord, packageIdentity: ContentExportPackageIdentity): ContentExportSubmission {
  // A whole-project snapshot: the project revision is the snapshot id itself (upstream export contract).
  return { snapshotId: snapshot.snapshotId, projectRevision: snapshot.snapshotId, baselineRevision: job.baseline_revision, packageIdentity, idempotencyKey: job.idempotency_key };
}

function samePackage(left: { packId: string; packVersion: string; contractVersion: number }, right: ContentExportPackageIdentity): boolean {
  return left.packId === right.packId && left.packVersion === right.packVersion && left.contractVersion === right.contractVersion;
}

/** Hands the job's snapshot to the provider once: lookup first after any earlier attempt, then submit under the same key. */
async function deliver(context: PublicationContext, port: PublicationProviderPort, job: JobRow): Promise<PublicationResult> {
  const now = context.now?.() ?? new Date().toISOString();
  const snapshot = await context.adapter.readSnapshot(job.snapshot_id);
  if (snapshot.status !== "ok") return { status: "unavailable", message: `Snapshot ${job.snapshot_id} could not be read (${snapshot.status}).` };
  const attempts = job.attempts + 1;
  const record = async (patch: JobPatch): Promise<JobRow> => (await casJob(context.db, context.projectId, job, { attempts, ...patch }, now)).row;
  const baseline = await context.adapter.readBaseline();
  if (baseline.status === "ok" && baseline.value.baselineRevision !== job.baseline_revision) {
    // A retry after the base moved would submit a stale snapshot.
    const row = (await casJob(context.db, context.projectId, job, { state: "conflict", message: `The integrated baseline moved to ${baseline.value.baselineRevision} before the provider acknowledged this publication.` }, now)).row;
    return { status: "conflict", reason: "baseline-revision", current: { baselineRevision: baseline.value.baselineRevision }, message: row.message ?? "", value: view(row) };
  }

  if (job.attempts > 0) {
    const existing = await port.lookupExisting(job.snapshot_id);
    if (existing.status === "ok") return { status: "ok", value: view(await record({ providerRef: existing.ref, message: null })), replayed: true };
    if (existing.status !== "not-found") {
      const row = await record({ message: `Provider lookup ${existing.status}: ${existing.message}` });
      return { status: "uncertain", operationId: row.job_id, message: existing.message, value: view(row) };
    }
  }
  const submitted = await port.submit({
    submission: submissionFor(job, snapshot.value, context.packageIdentity),
    snapshot: snapshot.value,
    ...(baseline.status === "ok" ? { baseline: baseline.value } : {}),
    requestedBy: job.requested_by,
    requestedAt: job.created_at,
  });
  switch (submitted.status) {
    case "ok":
      return { status: "ok", value: view(await record({ providerRef: submitted.ref, message: null })), replayed: submitted.replayed };
    case "rejected": {
      const row = await record({ state: "failed", message: `Provider refused the submission: ${submitted.message}` });
      return { status: "rejected", code: "provider-rejected", message: submitted.message, ...(submitted.path ? { path: submitted.path } : {}), value: view(row) };
    }
    case "conflict": {
      const row = await record({ state: "conflict", message: submitted.message });
      return { status: "conflict", reason: "operation-id", current: { baselineRevision: job.baseline_revision }, message: submitted.message, value: view(row) };
    }
    default: {
      const row = await record({ message: `Provider ${submitted.status}: ${submitted.message}` });
      return { status: "uncertain", operationId: row.job_id, message: submitted.message, value: view(row) };
    }
  }
}

/** `POST /api/v1/publications`: freeze-checked, idempotent per snapshot, never automatic on save. */
export async function requestPublication(context: PublicationContext, input: { snapshotId: string; expectedBaselineRevision: string }): Promise<PublicationResult> {
  if (!context.publisher.ok) return { status: "unavailable", code: "configuration-required", state: "configuration-required", message: context.publisher.message };
  const port = context.publisher.port;
  const jobId = publicationIdFor(input.snapshotId);
  const prior = await readJob(context.db, context.projectId, jobId);
  if (prior) {
    if (prior.state === "failed") {
      // Recovery: re-arm the same job (same key) and deliver again; `deliver` refuses if the base moved meanwhile.
      const now = context.now?.() ?? new Date().toISOString();
      const rearmed = await casJob(context.db, context.projectId, prior, { state: "submitted", providerRef: null, evidence: null, providerFailures: 0, message: `Retry requested by ${context.actor.subject} after: ${prior.message ?? "failed"}` }, now);
      return rearmed.won ? deliver(context, port, rearmed.row) : { status: "ok", value: view(rearmed.row), replayed: true };
    }
    // The same snapshot was already requested: the existing job, re-delivered only if the provider never acknowledged it.
    if (prior.provider_ref_json === null && !TERMINAL_PUBLICATION_STATES.includes(prior.state)) return deliver(context, port, prior);
    return { status: "ok", value: view(prior), replayed: true };
  }
  const snapshot = await context.adapter.readSnapshot(input.snapshotId);
  if (snapshot.status !== "ok") return snapshot.status === "not-found" ? { status: "not-found", message: `Snapshot ${input.snapshotId} does not exist.` } : { status: "unavailable", message: snapshot.message };
  const baseline = await context.adapter.readBaseline();
  if (baseline.status !== "ok") return { status: "unavailable", message: "The baseline is not seeded." };
  const current = { baselineRevision: baseline.value.baselineRevision };
  if (input.expectedBaselineRevision !== current.baselineRevision) return { status: "conflict", reason: "baseline-revision", current, message: "The integrated baseline moved; reload and snapshot again." };
  if (snapshot.value.baselineRevision !== current.baselineRevision) return { status: "conflict", reason: "baseline-revision", current, message: "The snapshot was frozen against an older baseline; snapshot the current draft again." };
  const pack = snapshot.value.project.componentPack;
  if (!samePackage(pack, context.packageIdentity)) return { status: "conflict", reason: "package-identity", current, message: `The snapshot uses ${pack.packId}@${pack.packVersion}, this Worker builds ${context.packageIdentity.packId}@${context.packageIdentity.packVersion}.` };

  const now = context.now?.() ?? new Date().toISOString();
  const token = crypto.randomUUID();
  await context.db
    .prepare(`INSERT INTO jobs (project_id, ${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, 'submitted', NULL, NULL, NULL, 0, 1, ?, ?, ?, ?, NULL, NULL, 0, 0) ON CONFLICT DO NOTHING`)
    .bind(context.projectId, jobId, input.snapshotId, current.baselineRevision, jobId, port.providerId, token, context.actor.subject, now, now)
    .run();
  const job = await readJob(context.db, context.projectId, jobId);
  if (!job) return { status: "unavailable", message: "The publication job could not be recorded." };
  // A concurrent request created it first: theirs is the job.
  if (job.update_token !== token) return { status: "ok", value: view(job), replayed: true };
  return deliver(context, port, job);
}

/** `GET /api/v1/publications/:id` without the reconcile loop: the stored job, refreshed from the provider when it is not terminal. */
export async function refreshPublication(context: PublicationContext, jobId: string): Promise<PublicationResult> {
  const job = await readJob(context.db, context.projectId, jobId);
  if (!job) return { status: "not-found" };
  if (!context.publisher.ok) return { status: "ok", value: configurationRequiredView(job, context.publisher.message) };
  if (TERMINAL_PUBLICATION_STATES.includes(job.state)) return { status: "ok", value: view(job) };
  return observeJob(context, context.publisher.port, job);
}

export function configurationRequiredView(job: JobRow, message: string): PublicationView {
  return { ...view(job), state: "configuration-required", lastObservedState: job.state, message };
}

/** One provider observation of a job (or its first delivery), written as one CAS with the attempt counters. */
export async function observeJob(context: PublicationContext, port: PublicationProviderPort, job: JobRow): Promise<PublicationResult> {
  if (job.provider_ref_json === null) return deliver(context, port, job);
  const ref = JSON.parse(job.provider_ref_json) as ProviderRef;
  const observed = await port.status(ref);
  const now = context.now?.() ?? new Date().toISOString();
  const reconcileAttempts = job.reconcile_attempts + 1;
  const write = async (patch: JobPatch): Promise<PublicationResult> => {
    // Lost the CAS: another refresh wrote first; its row is the truth.
    const { row } = await casJob(context.db, context.projectId, job, { reconcileAttempts, ...patch }, now);
    return { status: "ok", value: view(row) };
  };
  // A base that moved under a job still in flight means the snapshot can no longer integrate cleanly.
  const movedBase = async (): Promise<string | null> => {
    const baseline = await context.adapter.readBaseline();
    return baseline.status === "ok" && baseline.value.baselineRevision !== job.baseline_revision ? baseline.value.baselineRevision : null;
  };
  if (observed.status === "not-found") {
    // Nothing the provider says can settle this job any more; a moved base still decides it locally.
    // An integrated or live job moved the base itself; a lost provider record cannot demote it.
    const moved = job.state === "integrated" || job.state === "live" ? null : await movedBase();
    if (moved) return write({ state: "conflict", providerFailures: 0, message: `The provider has no record of this submission, and the integrated baseline moved to ${moved}.` });
    return write({ providerFailures: 0, message: "The provider has no record of this submission." });
  }
  if (observed.status !== "ok") {
    // Unknown is not failed: the state stays, the failure is counted and reported.
    const failures = job.provider_failures + 1;
    return write({ providerFailures: failures, message: `Provider ${observed.status} (${failures} in a row): ${observed.message}` });
  }
  const observation = observed.value;
  let state = publicationStateFor(observation);
  let message = observation.message ?? null;
  if (observation.snapshotId !== job.snapshot_id) {
    state = "conflict";
    message = `The provider reports snapshot ${observation.snapshotId}, not ${job.snapshot_id}.`;
  } else if (state !== "integrated" && state !== "live" && state !== "failed") {
    const moved = await movedBase();
    if (moved) {
      message = `The integrated baseline moved to ${moved} while this publication was ${state}.`;
      state = "conflict";
    }
  }
  return write({ state, evidence: observation.evidence ?? null, message, providerFailures: 0 });
}
