import type { ContentEntryRef, HostedCommit, HostedHead, HostedPublication, HostedReceipt, HostedRevision, HostedSnapshot, HostedStorage } from "zudo-composer/hosted-content";

/** All records are detached JSON reads. The mutable head never contains history. */
export class PinselHostedStorage implements HostedStorage {
  constructor(readonly db: D1Database) {}
  private async read<T>(sql: string, ...bindings: (string | number)[]): Promise<T | null> {
    const row = await this.db.prepare(sql).bind(...bindings).first<{ body: string }>();
    return row ? JSON.parse(row.body) as T : null;
  }
  async readHead(): Promise<HostedHead> {
    const head = await this.read<HostedHead>("SELECT body FROM pinsel_hosted_head WHERE id = 1");
    if (!head) throw new Error("Pinsel Hosted Content is not initialized");
    return head;
  }
  readReceipt(actorId: string, key: string): Promise<HostedReceipt | null> { return this.read("SELECT body FROM pinsel_hosted_receipt WHERE actor_id = ? AND operation_key = ?", actorId, key); }
  readSnapshot(id: string): Promise<HostedSnapshot | null> { return this.read("SELECT body FROM pinsel_hosted_snapshot WHERE id = ?", id); }
  readPublication(id: string): Promise<HostedPublication | null> { return this.read("SELECT body FROM pinsel_hosted_publication WHERE id = ?", id); }
  readRevision(id: string): Promise<HostedRevision | null> { return this.read("SELECT body FROM pinsel_hosted_revision WHERE id = ?", id); }
  async listRevisions(entry: ContentEntryRef, page: { beforeSequence?: number; limit: number }): Promise<HostedRevision[]> {
    const cursor = page.beforeSequence === undefined ? "" : " AND sequence < ?";
    const bindings = [entry.providerId, entry.modelId, entry.recordId, ...(page.beforeSequence === undefined ? [] : [page.beforeSequence]), page.limit];
    const rows = await this.db.prepare(`SELECT body FROM pinsel_hosted_revision WHERE provider_id = ? AND model_id = ? AND record_id = ?${cursor} ORDER BY sequence DESC LIMIT ?`).bind(...bindings).all<{ body: string }>();
    return rows.results.map(row => JSON.parse(row.body) as HostedRevision);
  }
  async commit(change: HostedCommit): Promise<boolean> {
    const { head, expectedVersion, receipt, snapshot, publication, revisions = [] } = change;
    const statements = [
      this.db.prepare("INSERT INTO pinsel_hosted_guard(value) SELECT NULL WHERE ? = ? OR NOT EXISTS (SELECT 1 FROM pinsel_hosted_head WHERE id = 1 AND version = ?)").bind(head.version, expectedVersion, expectedVersion),
      this.db.prepare("UPDATE pinsel_hosted_head SET version = ?, body = ? WHERE id = 1 AND version = ?").bind(head.version, JSON.stringify(head), expectedVersion),
      this.db.prepare("INSERT INTO pinsel_hosted_guard(value) SELECT NULL WHERE changes() != 1"),
    ];
    if (receipt) statements.push(this.db.prepare("INSERT INTO pinsel_hosted_receipt VALUES (?, ?, ?)").bind(receipt.actorId, receipt.operationKey, JSON.stringify(receipt)));
    if (snapshot) statements.push(this.db.prepare("INSERT INTO pinsel_hosted_snapshot VALUES (?, ?)").bind(snapshot.id, JSON.stringify(snapshot)));
    for (const revision of revisions) statements.push(this.db.prepare("INSERT INTO pinsel_hosted_revision VALUES (?, ?, ?, ?, ?, ?)").bind(revision.id, revision.entry.providerId, revision.entry.modelId, revision.entry.recordId, revision.sequence, JSON.stringify(revision)));
    if (publication) statements.push(this.db.prepare("INSERT INTO pinsel_hosted_publication VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body").bind(publication.id, JSON.stringify(publication)));
    try { await this.db.batch(statements); return true; }
    catch (error) {
      // These constraints are the explicit rejection contract. Unknown transport
      // errors propagate so the caller can recover the same operation's receipt.
      const message = `${String(error)} ${error instanceof Error && error.cause instanceof Error ? error.cause.message : ""}`;
      if (/NOT NULL constraint failed: pinsel_hosted_guard.value|UNIQUE constraint failed: pinsel_hosted_(receipt|snapshot|revision)\./.test(message)) return false;
      throw error;
    }
  }
}
