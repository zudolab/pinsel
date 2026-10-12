import type { ContentBaseline } from "zudo-composer/host-storage";
import type { ContentEntryRecord } from "zudo-composer/site-project";

// The storage half of the canonical reconcile path: move the stored baseline
// to a new canonical baseline and replace the draft entries with the planned
// rebase, in ONE `db.batch()`. The first statement inserts the advance token
// only while the draft is still exactly at `expectedDraftRevision` on
// `fromBaseline`; every later statement is gated on that token, so a save,
// snapshot-free advance or second reconcile that landed first leaves this
// batch writing nothing. The outcome is read back from the token row.

export interface RebaseWrite {
  fromBaseline: string;
  expectedDraftRevision: number;
  to: ContentBaseline;
  /** `contentSnapshotId` of the canonical project, recorded as the advance's integrated id. */
  canonicalDigest: string;
  entries: readonly ContentEntryRecord[];
  /** The open conflict this rebase resolves, if any. */
  conflict?: { conflictId: string; resolution: string };
}

export async function writeRebase(db: D1Database, projectId: string, input: RebaseWrite, at: string): Promise<boolean> {
  const token = crypto.randomUUID();
  const gate = "EXISTS (SELECT 1 FROM baseline_advances WHERE advance_token = ?)";
  const statements = [
    db
      .prepare(
        "INSERT INTO baseline_advances (advance_token, project_id, from_baseline, to_baseline, integrated_snapshot_id, created_at, kind) SELECT ?, ?, ?, ?, ?, ?, 'rebase' WHERE EXISTS (SELECT 1 FROM draft_state WHERE project_id = ? AND draft_revision = ? AND baseline_revision = ?)",
      )
      .bind(token, projectId, input.fromBaseline, input.to.baselineRevision, input.canonicalDigest, at, projectId, input.expectedDraftRevision, input.fromBaseline),
    db.prepare(`DELETE FROM draft_entries WHERE project_id = ? AND ${gate}`).bind(projectId, token),
    ...input.entries.map((entry, index) =>
      db.prepare(`INSERT INTO draft_entries (project_id, entry_id, model_id, position, record_json) SELECT ?, ?, ?, ?, ? WHERE ${gate}`).bind(projectId, entry.id, entry.modelId, index, JSON.stringify(entry), token),
    ),
    db.prepare(`UPDATE baseline SET baseline_revision = ?, project_json = ?, advanced_at = ? WHERE project_id = ? AND ${gate}`).bind(input.to.baselineRevision, JSON.stringify(input.to.project), at, projectId, token),
    db.prepare(`INSERT INTO revisions (project_id, draft_revision, kind, operation_id, created_at) SELECT ?, draft_revision + 1, 'rebase', NULL, ? FROM draft_state WHERE project_id = ? AND ${gate}`).bind(projectId, at, projectId, token),
    db.prepare(`UPDATE draft_state SET draft_revision = draft_revision + 1, baseline_revision = ?, updated_at = ? WHERE project_id = ? AND ${gate}`).bind(input.to.baselineRevision, at, projectId, token),
    // Any conflict recorded against the old baseline is settled by this rebase.
    db
      .prepare(`UPDATE baseline_conflicts SET state = CASE WHEN conflict_id = ? THEN 'resolved' ELSE 'superseded' END, resolution = ?, resolved_at = ? WHERE project_id = ? AND state = 'open' AND stored_baseline = ? AND ${gate}`)
      .bind(input.conflict?.conflictId ?? "", input.conflict?.resolution ?? "rebase", at, projectId, input.fromBaseline, token),
  ];
  await db.batch(statements);
  const written = await db.prepare("SELECT advance_token FROM baseline_advances WHERE advance_token = ?").bind(token).first<{ advance_token: string }>();
  return written !== null;
}

/** Revisions the stored baseline has already passed through (seed and every advance), so an older bundle is not mistaken for an external change. */
export async function isKnownBaseline(db: D1Database, projectId: string, revision: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 AS known FROM baseline_advances WHERE project_id = ? AND (from_baseline = ? OR to_baseline = ?) LIMIT 1").bind(projectId, revision, revision).first<{ known: number }>();
  return row !== null;
}
