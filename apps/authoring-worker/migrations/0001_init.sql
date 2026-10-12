-- Migration number: 0001 	 2026-10-12
-- Draft storage for the restricted content editor (zudo-composer/host-storage
-- `ContentDraftStorageAdapter`). Every multi-row write is one `db.batch()` whose
-- statements are SQL-gated on the precondition (see src/storage/d1-content-draft-storage.ts).

CREATE TABLE baseline (
  project_id TEXT PRIMARY KEY,
  baseline_revision TEXT NOT NULL,
  project_json TEXT NOT NULL,
  advanced_at TEXT NOT NULL
);

CREATE TABLE draft_state (
  project_id TEXT PRIMARY KEY,
  draft_revision INTEGER NOT NULL,
  baseline_revision TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE draft_entries (
  project_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  record_json TEXT NOT NULL,
  PRIMARY KEY (project_id, entry_id)
);

-- One row per applied operation: the durable receipt and the idempotency key.
CREATE TABLE operations (
  operation_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  attempt_token TEXT NOT NULL,
  actor_subject TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  receipt_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Append-only history of draft revisions.
CREATE TABLE revisions (
  project_id TEXT NOT NULL,
  draft_revision INTEGER NOT NULL,
  kind TEXT NOT NULL,
  operation_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, draft_revision)
);

-- Immutable, content-addressed project captures.
CREATE TABLE snapshots (
  snapshot_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  draft_revision INTEGER NOT NULL,
  baseline_revision TEXT NOT NULL,
  project_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE baseline_advances (
  advance_token TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  from_baseline TEXT NOT NULL,
  to_baseline TEXT NOT NULL,
  integrated_snapshot_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
