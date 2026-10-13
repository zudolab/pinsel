-- Migration number: 0003 	 2026-10-13
-- Reconciliation bookkeeping for publication jobs (src/publish/reconcile.ts).
--
-- `lease_token` / `lease_expires_at`: one reconciliation of a job at a time.
-- A reconcile claims the lease with a conditional UPDATE and reads the row back;
-- a concurrent one sees someone else's token and returns the stored job without
-- calling the provider. An expired lease (crashed isolate) can be taken over.
-- `reconcile_attempts`: provider observations made for the job.
-- `provider_failures`: consecutive timeouts/unavailable answers; reset by any answer.
ALTER TABLE jobs ADD COLUMN lease_token TEXT;
ALTER TABLE jobs ADD COLUMN lease_expires_at TEXT;
ALTER TABLE jobs ADD COLUMN reconcile_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN provider_failures INTEGER NOT NULL DEFAULT 0;
