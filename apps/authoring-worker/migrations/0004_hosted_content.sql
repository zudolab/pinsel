-- Hosted Content uses independent tables. Legacy drafts, receipts and snapshots
-- remain intact for audit/export; old receipts are never replayed as new commands.
CREATE TABLE pinsel_hosted_head (id INTEGER PRIMARY KEY CHECK (id = 1), version TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE pinsel_hosted_guard (value INTEGER NOT NULL);
CREATE TABLE pinsel_hosted_receipt (actor_id TEXT NOT NULL, operation_key TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(actor_id, operation_key));
CREATE TABLE pinsel_hosted_snapshot (id TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE pinsel_hosted_publication (id TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE pinsel_hosted_revision (id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, model_id TEXT NOT NULL, record_id TEXT NOT NULL, sequence INTEGER NOT NULL, body TEXT NOT NULL, UNIQUE(provider_id, model_id, record_id, sequence));
CREATE TABLE pinsel_hosted_migration (id INTEGER PRIMARY KEY CHECK(id = 1), created_at TEXT NOT NULL, archive TEXT NOT NULL);
