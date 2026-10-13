import { contentSnapshotId, type ContentBaseline } from "zudo-composer/host-storage";

// An immutable snapshot of the stored (integrated) baseline, so the editor can
// preview "integrated" next to "draft" through the same /preview/:snapshotId
// route. Created on first read after every seed, publication advance or
// canonical rebase (the stored baseline is the only input), never deleted.
// When a draft snapshot of identical content already exists it is that row:
// the id is the content digest, so `revision` is whichever row was stored first.

export interface BaselinePreview {
  snapshotId: string;
  /** The `revision` the preview URL must carry (`?revision=`), i.e. the stored row's draft revision. */
  revision: number;
}

export async function ensureBaselinePreview(db: D1Database, projectId: string, baseline: ContentBaseline, now: () => string = () => new Date().toISOString()): Promise<BaselinePreview> {
  const snapshotId = await contentSnapshotId(baseline.project);
  // Revision 0: before any draft revision (the seeded draft is 1).
  await db
    .prepare("INSERT OR IGNORE INTO snapshots (snapshot_id, project_id, draft_revision, baseline_revision, project_json, created_at) VALUES (?, ?, 0, ?, ?, ?)")
    .bind(snapshotId, projectId, baseline.baselineRevision, JSON.stringify(baseline.project), now())
    .run();
  const row = await db.prepare("SELECT draft_revision FROM snapshots WHERE snapshot_id = ? AND project_id = ?").bind(snapshotId, projectId).first<{ draft_revision: number }>();
  if (!row) throw new Error(`Baseline preview snapshot ${snapshotId} could not be stored.`);
  return { snapshotId, revision: row.draft_revision };
}
