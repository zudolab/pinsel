import { createD1ContentDraftStorage } from "../storage/d1-content-draft-storage";
import { advanceFromPublication } from "../baseline/advance";
import type { AuthoringSite } from "../site/baseline";
import { casJob, configurationRequiredView, observeJob, readJob, view, type JobRow, type PublicationContext, type PublicationResult, type PublicationView } from "./jobs";
import { TERMINAL_PUBLICATION_STATES, selectPublisher, type ProviderRef, type PublisherEnv, type PublisherFactory } from "./port";

// The publication reconciliation loop: `GET /api/v1/publications/:id` runs it
// on demand and the `scheduled()` handler runs it for every open job when
// `PUBLICATION_RECONCILE_SCHEDULE=enabled` (and a cron trigger exists; neither
// is configured in this repository).
//
// One pass over a job, under a per-job lease so concurrent passes never call
// the provider twice:
//   observe → (validated + PROMOTION_POLICY=auto) promote, then observe again
//   → (integrated, not yet advanced) advance the stored baseline from the
//   provider's verified evidence.
// The provider's own observation decides every state; a promotion answer is
// never taken as proof of integration.

export const DEFAULT_LEASE_MS = 60_000;

export type BaselineAdvanceStatus =
  | { status: "advanced"; gitSha: string; replayed: boolean }
  /** The stored baseline is no longer the publication's base: reconcile the canonical change (`POST /api/v1/baseline/reconcile`). */
  | { status: "conflict"; message: string }
  | { status: "pending"; message: string };

export interface ReconciledPublicationView extends PublicationView {
  /** Set once the job is integrated: whether the stored baseline moved to the merge commit. */
  baselineAdvance?: BaselineAdvanceStatus;
  /** Another reconciliation holds this job; the stored state is returned unchanged. */
  reconciling?: true;
}

export type ReconcileResult = Exclude<PublicationResult, { status: "ok" }> | { status: "ok"; value: ReconciledPublicationView; replayed?: boolean };

export interface ReconcileOptions {
  leaseMs?: number;
}

async function claimLease(context: PublicationContext, jobId: string, leaseMs: number): Promise<string | null> {
  const token = crypto.randomUUID();
  const now = context.now?.() ?? new Date().toISOString();
  const expires = new Date(Date.parse(now) + leaseMs).toISOString();
  await context.db.prepare("UPDATE jobs SET lease_token = ?, lease_expires_at = ? WHERE job_id = ? AND project_id = ? AND (lease_token IS NULL OR lease_expires_at <= ?)").bind(token, expires, jobId, context.projectId, now).run();
  const row = await context.db.prepare("SELECT lease_token FROM jobs WHERE job_id = ? AND project_id = ?").bind(jobId, context.projectId).first<{ lease_token: string | null }>();
  return row?.lease_token === token ? token : null;
}

async function releaseLease(context: PublicationContext, jobId: string, token: string): Promise<void> {
  await context.db.prepare("UPDATE jobs SET lease_token = NULL, lease_expires_at = NULL WHERE job_id = ? AND project_id = ? AND lease_token = ?").bind(jobId, context.projectId, token).run();
}

async function advanced(context: PublicationContext, jobId: string): Promise<boolean> {
  return (await context.db.prepare("SELECT 1 AS ok FROM baseline_evidence WHERE job_id = ? AND project_id = ?").bind(jobId, context.projectId).first<{ ok: number }>()) !== null;
}

async function reread(context: PublicationContext, job: JobRow): Promise<JobRow> {
  return (await readJob(context.db, context.projectId, job.job_id)) ?? job;
}

async function annotate(context: PublicationContext, job: JobRow, patch: Parameters<typeof casJob>[3]): Promise<void> {
  await casJob(context.db, context.projectId, job, patch, context.now?.() ?? new Date().toISOString());
}

/** One reconciliation pass over a job; see the module comment. */
export async function reconcilePublication(context: PublicationContext, jobId: string, options: ReconcileOptions = {}): Promise<ReconcileResult> {
  const job = await readJob(context.db, context.projectId, jobId);
  if (!job) return { status: "not-found" };
  if (!context.publisher.ok) return { status: "ok", value: configurationRequiredView(job, context.publisher.message) };
  const needsAdvance = (state: string) => state === "integrated" || state === "live";
  // Terminal jobs are final, except a `live` one whose baseline advance never ran.
  if (TERMINAL_PUBLICATION_STATES.includes(job.state) && (job.state !== "live" || (await advanced(context, jobId)))) return { status: "ok", value: view(job) };

  const lease = await claimLease(context, jobId, options.leaseMs ?? DEFAULT_LEASE_MS);
  if (!lease) return { status: "ok", value: { ...view(await reread(context, job)), reconciling: true } };
  try {
    const { port, config } = context.publisher;
    let current = await reread(context, job);
    if (!TERMINAL_PUBLICATION_STATES.includes(current.state)) {
      const observed = await observeJob(context, port, current);
      if (observed.status !== "ok") return observed;
      current = await reread(context, current);
    }

    if (current.state === "validated" && config.promotionPolicy === "auto" && port.promote && current.provider_ref_json) {
      const promoted = await port.promote(JSON.parse(current.provider_ref_json) as ProviderRef);
      if (promoted.status === "ok") {
        // Integration is whatever the provider now proves, not what the merge call answered.
        const observed = await observeJob(context, port, await reread(context, current));
        if (observed.status !== "ok") return observed;
      } else if (promoted.status === "conflict") {
        await annotate(context, current, { state: "conflict", message: `Promotion found a conflict: ${promoted.message}` });
      } else if (promoted.status === "refused") {
        await annotate(context, current, { message: `Promotion refused: ${promoted.message}` });
      } else {
        await annotate(context, current, { providerFailures: current.provider_failures + 1, message: `Promotion ${promoted.status}: ${promoted.message}` });
      }
      current = await reread(context, current);
    }

    if (needsAdvance(current.state)) {
      if (await advanced(context, jobId)) {
        const gitSha = (await context.db.prepare("SELECT git_sha FROM baseline_evidence WHERE job_id = ? AND project_id = ?").bind(jobId, context.projectId).first<{ git_sha: string }>())?.git_sha ?? "";
        return { status: "ok", value: { ...view(current), baselineAdvance: { status: "advanced", gitSha, replayed: true } } };
      }
      const outcome = await advanceFromPublication(context, jobId);
      const after = await reread(context, current);
      if (outcome.status === "ok") return { status: "ok", value: { ...view(after), baselineAdvance: { status: "advanced", gitSha: outcome.value.baseline.gitSha, replayed: outcome.value.replayed } } };
      const message = "message" in outcome && outcome.message ? outcome.message : `Baseline advance ${outcome.status}.`;
      return { status: "ok", value: { ...view(after), baselineAdvance: outcome.status === "conflict" ? { status: "conflict", message } : { status: "pending", message } } };
    }
    return { status: "ok", value: view(current) };
  } finally {
    await releaseLease(context, jobId, lease);
  }
}

/** Every job a scheduled pass should look at: in flight, or integrated but not yet advanced. */
export async function pendingPublicationIds(db: D1Database, projectId: string, limit = 25): Promise<string[]> {
  const rows = await db
    .prepare(
      "SELECT job_id FROM jobs WHERE project_id = ? AND (state IN ('submitted', 'building', 'validated') OR (state IN ('integrated', 'live') AND NOT EXISTS (SELECT 1 FROM baseline_evidence WHERE baseline_evidence.job_id = jobs.job_id))) ORDER BY created_at LIMIT ?",
    )
    .bind(projectId, limit)
    .all<{ job_id: string }>();
  return rows.results.map((row) => row.job_id);
}

export interface ScheduledReconcileEnv extends PublisherEnv {
  DB: D1Database;
  PUBLICATION_RECONCILE_SCHEDULE?: string;
}

/** The `scheduled()` body: a no-op unless `PUBLICATION_RECONCILE_SCHEDULE=enabled` and a publisher is configured. */
export async function reconcileScheduled(env: ScheduledReconcileEnv, site: AuthoringSite, publishers: Readonly<Record<string, PublisherFactory>>, options: ReconcileOptions = {}): Promise<{ ran: boolean; results: { publicationId: string; state: string }[] }> {
  if ((env.PUBLICATION_RECONCILE_SCHEDULE ?? "disabled").trim() !== "enabled") return { ran: false, results: [] };
  const publisher = selectPublisher(env as ScheduledReconcileEnv & Record<string, unknown>, publishers);
  if (!publisher.ok) return { ran: false, results: [] };
  const context: PublicationContext = {
    db: env.DB,
    projectId: site.projectId,
    adapter: createD1ContentDraftStorage(env.DB, { projectId: site.projectId }),
    actor: { subject: "system:publication-reconcile" },
    publisher,
    packageIdentity: site.packageIdentity,
  };
  const results: { publicationId: string; state: string }[] = [];
  // Sequential on purpose: one provider conversation at a time per isolate.
  for (const publicationId of await pendingPublicationIds(env.DB, site.projectId)) {
    const result = await reconcilePublication(context, publicationId, options);
    results.push({ publicationId, state: result.status === "ok" ? result.value.state : result.status });
  }
  return { ran: true, results };
}
