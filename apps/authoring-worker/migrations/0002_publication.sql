-- Migration number: 0002 	 2026-10-13
-- Publication jobs, verified baseline evidence and recoverable canonical
-- conflicts. Same write discipline as 0001: every multi-row write is one
-- `db.batch()` gated on a token row (see src/storage/baseline-rebase.ts and
-- src/publish/jobs.ts).

-- One job per immutable snapshot. `state` uses the API vocabulary
-- (submitted | building | validated | integrated | live | failed | conflict);
-- every change is a compare-and-set on `version` that also rewrites
-- `update_token`, so the winner is known by reading the row back.
CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  baseline_revision TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  state TEXT NOT NULL,
  provider_ref_json TEXT,
  evidence_json TEXT,
  message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  update_token TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, snapshot_id)
);

-- What a baseline advance was based on: provider-verified evidence only.
CREATE TABLE baseline_evidence (
  job_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  git_sha TEXT NOT NULL,
  content_digest TEXT NOT NULL,
  package_identity_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  advanced_at TEXT NOT NULL
);

-- `publication` rows come from adapter.advanceBaseline; `rebase` rows from the
-- canonical reconcile path, whose `integrated_snapshot_id` is the canonical
-- project digest.
ALTER TABLE baseline_advances ADD COLUMN kind TEXT NOT NULL DEFAULT 'publication';

-- An external canonical change met a draft with unsent edits.
CREATE TABLE baseline_conflicts (
  conflict_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stored_baseline TEXT NOT NULL,
  canonical_baseline TEXT NOT NULL,
  canonical_digest TEXT NOT NULL,
  draft_revision INTEGER NOT NULL,
  state TEXT NOT NULL,
  resolution TEXT,
  detected_at TEXT NOT NULL,
  resolved_at TEXT
);
