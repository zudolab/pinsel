import { contentSnapshotId, sha256Hex, type ContentBaseline, type ContentDraftState, type ContentDraftStorageAdapter } from "zudo-composer/host-storage";
import type { SiteProject } from "zudo-composer/site-project";
import { isKnownBaseline, writeRebase } from "../storage/baseline-rebase";
import { planRebase, type RebaseConflict, type RebasePreference } from "./three-way";

// `POST /api/v1/baseline/reconcile`: compare the stored baseline with the
// canonical baseline this Worker was assembled from (Git at build time).
//
// - same revision, or the bundle is a revision the store already passed: nothing to do;
// - same canonical content under a new commit (a code-only change): adopt the new identity, keep the draft;
// - new content and a draft without unsent edits: fast-forward the draft;
// - new content and unsent edits: record a recoverable conflict and return the
//   three-way plan; the caller resolves it by repeating the request with
//   `{ conflictId, expectedDraftRevision, prefer? }`. Nothing is overwritten silently.

export interface ReconcileContext {
  db: D1Database;
  projectId: string;
  providerId: string;
  adapter: ContentDraftStorageAdapter;
  canonical: ContentBaseline;
  now?: () => string;
}

export interface ReconcileResolution {
  conflictId: string;
  expectedDraftRevision: number;
  prefer?: RebasePreference;
}

export interface CanonicalConflict {
  conflictId: string;
  storedBaselineRevision: string;
  canonicalBaselineRevision: string;
  draftRevision: number;
  conflicts: RebaseConflict[];
  rebase: { method: "POST"; path: "/api/v1/baseline/reconcile"; body: { conflictId: string; expectedDraftRevision: number; prefer: "draft | canonical (required when conflicts is not empty)" } };
}

export type ReconcileResult =
  | { status: "ok"; value: { state: "in-sync" | "behind" | "rebased"; kind?: "identity" | "fast-forward" | "merge"; baselineRevision: string; canonicalBaselineRevision: string; draft?: ContentDraftState } }
  | { status: "conflict"; reason: "baseline-revision"; current: { draftRevision: number; baselineRevision: string }; conflict: CanonicalConflict }
  | { status: "conflict"; reason: "draft-revision"; current: { draftRevision: number; baselineRevision: string } }
  | { status: "rejected"; code: "validation"; message: string }
  | { status: "unavailable"; message: string };

function entriesOf(project: SiteProject, providerId: string) {
  const provider = project.providers.content.find((candidate) => candidate.id === providerId);
  if (!provider) throw new Error(`Project has no Content provider "${providerId}".`);
  return provider;
}

export async function reconcileCanonical(context: ReconcileContext, resolution?: ReconcileResolution): Promise<ReconcileResult> {
  const [stored, draft] = await Promise.all([context.adapter.readBaseline(), context.adapter.readDraft()]);
  if (stored.status !== "ok" || draft.status !== "ok") return { status: "unavailable", message: "The draft is not seeded." };
  const canonical = context.canonical;
  const summary = { baselineRevision: stored.value.baselineRevision, canonicalBaselineRevision: canonical.baselineRevision };
  if (stored.value.baselineRevision === canonical.baselineRevision) return { status: "ok", value: { state: "in-sync", ...summary } };
  if (await isKnownBaseline(context.db, context.projectId, canonical.baselineRevision)) return { status: "ok", value: { state: "behind", ...summary } };

  const current = { draftRevision: draft.value.draftRevision, baselineRevision: draft.value.baselineRevision };
  const conflictId = `conflict-${(await sha256Hex(`${stored.value.baselineRevision}\n${canonical.baselineRevision}`)).slice(0, 32)}`;
  const [storedDigest, canonicalDigest] = await Promise.all([contentSnapshotId(stored.value.project), contentSnapshotId(canonical.project)]);
  const canonicalProvider = entriesOf(canonical.project, context.providerId);
  const identityOnly = storedDigest === canonicalDigest;
  const plan = identityOnly
    ? { entries: [...draft.value.snapshot.entries], draftChanged: false, conflicts: [], unresolved: [] }
    : planRebase(entriesOf(stored.value.project, context.providerId).entries, draft.value.snapshot.entries, canonicalProvider.entries, canonicalProvider.models, resolution?.prefer);
  const kind = identityOnly ? "identity" : plan.draftChanged ? "merge" : "fast-forward";
  const at = context.now?.() ?? new Date().toISOString();

  if (kind === "merge") {
    const conflict: CanonicalConflict = {
      conflictId,
      storedBaselineRevision: stored.value.baselineRevision,
      canonicalBaselineRevision: canonical.baselineRevision,
      draftRevision: draft.value.draftRevision,
      conflicts: resolution ? plan.unresolved : plan.conflicts,
      rebase: { method: "POST", path: "/api/v1/baseline/reconcile", body: { conflictId, expectedDraftRevision: draft.value.draftRevision, prefer: "draft | canonical (required when conflicts is not empty)" } },
    };
    if (!resolution) {
      await context.db
        .prepare("INSERT INTO baseline_conflicts (conflict_id, project_id, stored_baseline, canonical_baseline, canonical_digest, draft_revision, state, detected_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?) ON CONFLICT (conflict_id) DO UPDATE SET draft_revision = excluded.draft_revision WHERE state = 'open'")
        .bind(conflictId, context.projectId, stored.value.baselineRevision, canonical.baselineRevision, canonicalDigest, draft.value.draftRevision, at)
        .run();
      return { status: "conflict", reason: "baseline-revision", current, conflict };
    }
    if (resolution.conflictId !== conflictId) return { status: "rejected", code: "validation", message: `conflictId does not name the current canonical conflict (${conflictId}).` };
    if (resolution.expectedDraftRevision !== draft.value.draftRevision) return { status: "conflict", reason: "draft-revision", current };
    if (plan.unresolved.length > 0) return { status: "conflict", reason: "baseline-revision", current, conflict };
  }

  const written = await writeRebase(
    context.db,
    context.projectId,
    {
      fromBaseline: stored.value.baselineRevision,
      expectedDraftRevision: resolution?.expectedDraftRevision ?? draft.value.draftRevision,
      to: canonical,
      canonicalDigest,
      entries: plan.entries,
      ...(kind === "merge" ? { conflict: { conflictId, resolution: resolution?.prefer ? `rebase-prefer-${resolution.prefer}` : "rebase" } } : {}),
    },
    at,
  );
  const after = await context.adapter.readDraft();
  if (after.status !== "ok") return { status: "unavailable", message: "The draft could not be read." };
  if (!written) return { status: "conflict", reason: "draft-revision", current: { draftRevision: after.value.draftRevision, baselineRevision: after.value.baselineRevision } };
  return { status: "ok", value: { state: "rebased", kind, ...summary, baselineRevision: canonical.baselineRevision, draft: after.value } };
}
