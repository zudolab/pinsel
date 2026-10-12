import type { ContentDraftState } from "zudo-composer/host-storage";
import { readJob, refreshPublication, type PublicationContext, type PublicationView } from "../publish/jobs";

// `POST /api/v1/baseline/advance`: the storage side of an integrated
// publication. The only input is the publication id; the new Git sha comes
// from the provider's own evidence, re-read here (`refreshPublication`), never
// from the caller. The integrated content is the job's immutable snapshot, so
// `adapter.advanceBaseline` rebuilds a draft still at that snapshot's revision
// and keeps any newer unsent edit as the draft on the new baseline. Retrying an
// advance that already happened is a replay, recorded evidence included.

export type AdvanceResult =
  | { status: "ok"; value: { draft: ContentDraftState; baseline: { gitSha: string; contentDigest: string; packageIdentity: unknown }; publication: PublicationView; replayed: boolean } }
  | { status: "not-found"; message?: string }
  | { status: "rejected"; code: "not-integrated" | "validation"; message: string; value?: PublicationView }
  | { status: "conflict"; reason: "baseline-revision" | "draft-revision" | "operation-id"; current: { draftRevision: number; baselineRevision: string }; message?: string }
  | { status: "unavailable" | "uncertain"; code?: "configuration-required"; state?: "configuration-required"; message: string };

export async function advanceFromPublication(context: PublicationContext, publicationId: string): Promise<AdvanceResult> {
  if (!context.publisher.ok) return { status: "unavailable", code: "configuration-required", state: "configuration-required", message: context.publisher.message };
  const refreshed = await refreshPublication(context, publicationId);
  if (refreshed.status === "not-found") return { status: "not-found" };
  if (refreshed.status !== "ok") return { status: "unavailable", message: "message" in refreshed ? refreshed.message : "The publication could not be refreshed." };
  const publication = refreshed.value;
  const commit = publication.evidence?.commit;
  if ((publication.state !== "integrated" && publication.state !== "live") || !commit) {
    return { status: "rejected", code: "not-integrated", message: `Publication ${publicationId} is ${publication.state}; the provider has not proven an integration commit.`, value: publication };
  }
  const job = await readJob(context.db, context.projectId, publicationId);
  const snapshot = await context.adapter.readSnapshot(publication.snapshotId);
  if (!job || snapshot.status !== "ok") return { status: "unavailable", message: "The publication's snapshot could not be read." };
  const evidence = { gitSha: commit, contentDigest: snapshot.value.snapshotId, packageIdentity: snapshot.value.project.componentPack };
  const at = context.now?.() ?? new Date().toISOString();
  const recordEvidence = () =>
    context.db
      .prepare("INSERT INTO baseline_evidence (job_id, project_id, git_sha, content_digest, package_identity_json, evidence_json, advanced_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (job_id) DO NOTHING")
      .bind(publicationId, context.projectId, commit, evidence.contentDigest, JSON.stringify(evidence.packageIdentity), JSON.stringify(publication.evidence), at)
      .run();

  const baseline = await context.adapter.readBaseline();
  if (baseline.status !== "ok") return { status: "unavailable", message: "The baseline is not seeded." };
  if (baseline.value.baselineRevision === commit) {
    // Already advanced to this commit, by this publication: replay (and finish recording evidence after a crash).
    const ours = await context.db.prepare("SELECT 1 AS ok FROM baseline_advances WHERE project_id = ? AND to_baseline = ? AND integrated_snapshot_id = ? AND kind = 'publication'").bind(context.projectId, commit, publication.snapshotId).first<{ ok: number }>();
    const draft = await context.adapter.readDraft();
    if (!ours || draft.status !== "ok") return { status: "conflict", reason: "baseline-revision", current: { draftRevision: draft.status === "ok" ? draft.value.draftRevision : 0, baselineRevision: commit }, message: "The baseline is at this commit, but not through this publication." };
    await recordEvidence();
    return { status: "ok", value: { draft: draft.value, baseline: evidence, publication, replayed: true } };
  }
  const advanced = await context.adapter.advanceBaseline({ baseline: { project: snapshot.value.project, baselineRevision: commit }, expectedBaselineRevision: job.baseline_revision, integratedSnapshotId: snapshot.value.snapshotId });
  if (advanced.status === "conflict") return { ...advanced, message: "The stored baseline is not the publication's base; reconcile the canonical change first." };
  if (advanced.status !== "ok") return advanced.status === "rejected" ? { status: "rejected", code: "validation", message: advanced.message } : advanced.status === "not-found" ? { status: "not-found" } : { status: "unavailable", message: advanced.message };
  await recordEvidence();
  return { status: "ok", value: { draft: advanced.value, baseline: evidence, publication, replayed: false } };
}
