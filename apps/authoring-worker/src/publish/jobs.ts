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
// restart never creates a second submission. The reconciliation loop of the
// publication sub-issue (src/publish/reconcile.ts) builds on `refreshPublication`.

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
  attempts: number;
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

const COLUMNS = "job_id, snapshot_id, baseline_revision, idempotency_key, provider_id, state, provider_ref_json, evidence_json, message, attempts, version, update_token, requested_by, created_at, updated_at";

/** Deterministic per snapshot, and a valid upstream idempotency key (short, no separators). */
export function publicationIdFor(snapshotId: string): string {
  return `pub-${snapshotId.slice(0, 32)}`;
}

function view(row: JobRow): PublicationView {
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
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
}

/** One CAS on `version`. Returns the row after the attempt and whether this call wrote it. */
async function casJob(db: D1Database, projectId: string, row: JobRow, patch: JobPatch, now: string): Promise<{ won: boolean; row: JobRow }> {
  const token = crypto.randomUUID();
  const providerRef = patch.providerRef === undefined ? row.provider_ref_json : patch.providerRef === null ? null : JSON.stringify(patch.providerRef);
  const evidence = patch.evidence === undefined ? row.evidence_json : patch.evidence === null ? null : JSON.stringify(patch.evidence);
  await db
    .prepare("UPDATE jobs SET state = ?, provider_ref_json = ?, evidence_json = ?, message = ?, attempts = ?, version = version + 1, update_token = ?, updated_at = ? WHERE job_id = ? AND project_id = ? AND version = ?")
    .bind(patch.state ?? row.state, providerRef, evidence, patch.message === undefined ? row.message : patch.message, patch.attempts ?? row.attempts, token, now, row.job_id, projectId, row.version)
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

  if (job.attempts > 0) {
    const existing = await port.lookupExisting(job.snapshot_id);
    if (existing.status === "ok") return { status: "ok", value: view(await record({ providerRef: existing.ref, message: null })), replayed: true };
    if (existing.status !== "not-found") {
      const row = await record({ message: `Provider lookup ${existing.status}: ${existing.message}` });
      return { status: "uncertain", operationId: row.job_id, message: existing.message, value: view(row) };
    }
  }
  const submitted = await port.submit({ submission: submissionFor(job, snapshot.value, context.packageIdentity), snapshot: snapshot.value });
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
    .prepare(`INSERT INTO jobs (project_id, ${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, 'submitted', NULL, NULL, NULL, 0, 1, ?, ?, ?, ?) ON CONFLICT DO NOTHING`)
    .bind(context.projectId, jobId, input.snapshotId, current.baselineRevision, jobId, port.providerId, token, context.actor.subject, now, now)
    .run();
  const job = await readJob(context.db, context.projectId, jobId);
  if (!job) return { status: "unavailable", message: "The publication job could not be recorded." };
  // A concurrent request created it first: theirs is the job.
  if (job.update_token !== token) return { status: "ok", value: view(job), replayed: true };
  return deliver(context, port, job);
}

/** `GET /api/v1/publications/:id`: the stored job, refreshed from the provider when it is not terminal. */
export async function refreshPublication(context: PublicationContext, jobId: string): Promise<PublicationResult> {
  const job = await readJob(context.db, context.projectId, jobId);
  if (!job) return { status: "not-found" };
  if (!context.publisher.ok) return { status: "ok", value: { ...view(job), state: "configuration-required", lastObservedState: job.state, message: context.publisher.message } };
  if (TERMINAL_PUBLICATION_STATES.includes(job.state)) return { status: "ok", value: view(job) };
  const port = context.publisher.port;
  if (job.provider_ref_json === null) return deliver(context, port, job);
  const ref = JSON.parse(job.provider_ref_json) as ProviderRef;
  const observed = await port.status(ref);
  if (observed.status === "not-found") return { status: "ok", value: { ...view(job), message: "The provider has no record of this submission." } };
  if (observed.status !== "ok") return { status: "ok", value: { ...view(job), message: `Provider ${observed.status}: ${observed.message}` } };
  const observation = observed.value;
  let state = publicationStateFor(observation);
  let message = observation.message ?? null;
  if (observation.snapshotId !== job.snapshot_id) {
    state = "conflict";
    message = `The provider reports snapshot ${observation.snapshotId}, not ${job.snapshot_id}.`;
  } else if (state !== "integrated" && state !== "live" && state !== "failed") {
    // A base that moved under a job still in flight means the snapshot can no longer integrate cleanly.
    const baseline = await context.adapter.readBaseline();
    if (baseline.status === "ok" && baseline.value.baselineRevision !== job.baseline_revision) {
      message = `The integrated baseline moved to ${baseline.value.baselineRevision} while this publication was ${state}.`;
      state = "conflict";
    }
  }
  const evidence = observation.evidence ?? null;
  if (state === job.state && JSON.stringify(evidence) === (job.evidence_json ?? "null") && message === job.message) return { status: "ok", value: view(job) };
  const now = context.now?.() ?? new Date().toISOString();
  const { row } = await casJob(context.db, context.projectId, job, { state, evidence, message }, now);
  // Lost the CAS: another refresh wrote first; its row is the truth.
  return { status: "ok", value: view(row) };
}
