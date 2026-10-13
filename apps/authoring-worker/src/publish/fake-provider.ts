import type { ContentExportState, ContentExportSubmission } from "zudo-composer/export";
import { validateContentExportSubmission } from "zudo-composer/export";
import type { ProviderObservation, ProviderRef, PublicationEvidence, PublicationProviderPort } from "./port";

// Deterministic in-memory provider for tests and `wrangler dev --env local`.
// Operation ids are sequential, states only move when a test calls `advance`,
// and failures are scripted per method. Never part of the production bundle
// (scripts/check-worker-bundle.mjs greps for the marker below).
export const FAKE_PROVIDER_MARKER = "pinsel-fake-publication-provider";

/**
 * - `timeout` / `unavailable`: the call does nothing and reports that.
 * - `lost-ack` (submit only): the submission is recorded, then reported as a timeout.
 * - `rejected` (submit, promote): the provider refuses the submission / the merge.
 */
export type FakeOutcome = "timeout" | "unavailable" | "lost-ack" | "rejected";

type FakeMethod = "submit" | "status" | "lookupExisting" | "promote";

export interface FakePublicationProvider extends PublicationProviderPort {
  readonly marker: typeof FAKE_PROVIDER_MARKER;
  readonly submissions: readonly { operationId: string; submission: ContentExportSubmission; files: readonly string[] }[];
  readonly calls: { submit: number; status: number; lookupExisting: number; promote: number };
  /** Queue an outcome for the next call of `method`. */
  script(method: FakeMethod, outcome: FakeOutcome): void;
  /** Move a submission to `state`, optionally with evidence; unknown ids throw. */
  advance(operationId: string, state: ContentExportState, details?: { evidence?: PublicationEvidence; message?: string }): void;
}

export interface FakePublicationProviderOptions {
  providerId?: string;
  now?: () => string;
}

export function createFakePublicationProvider(options: FakePublicationProviderOptions = {}): FakePublicationProvider {
  const providerId = options.providerId ?? "fake";
  const now = options.now ?? (() => new Date().toISOString());
  const byKey = new Map<string, { operationId: string; submission: ContentExportSubmission }>();
  const bySnapshot = new Map<string, string>();
  const observations = new Map<string, ProviderObservation>();
  const submissions: { operationId: string; submission: ContentExportSubmission; files: string[] }[] = [];
  const scripted: Record<FakeMethod, FakeOutcome[]> = { submit: [], status: [], lookupExisting: [], promote: [] };
  const calls = { submit: 0, status: 0, lookupExisting: 0, promote: 0 };
  let merges = 0;
  const ref = (operationId: string): ProviderRef => ({ providerId, operationId, branch: `content/${observations.get(operationId)?.snapshotId ?? ""}` });

  return {
    marker: FAKE_PROVIDER_MARKER,
    providerId,
    submissions,
    calls,
    script(method, outcome) {
      scripted[method].push(outcome);
    },
    async submit({ submission, snapshot }) {
      calls.submit += 1;
      const outcome = scripted.submit.shift();
      if (outcome === "timeout" || outcome === "unavailable") return { status: outcome, message: `fake provider ${outcome}` };
      if (outcome === "rejected") return { status: "rejected", message: "fake provider refused the submission" };
      const validation = validateContentExportSubmission(submission);
      if (!validation.ok) return { status: "rejected", message: validation.message, ...(validation.path ? { path: validation.path } : {}) };
      if (snapshot.snapshotId !== submission.snapshotId) return { status: "rejected", message: "snapshot record does not match the submission", path: "snapshotId" };
      const existing = byKey.get(submission.idempotencyKey);
      if (existing) {
        if (JSON.stringify(existing.submission) !== JSON.stringify(validation.value)) return { status: "conflict", message: `idempotency key already names ${existing.operationId}` };
        return outcome === "lost-ack" ? { status: "timeout", message: "fake provider lost the acknowledgement" } : { status: "ok", ref: ref(existing.operationId), replayed: true };
      }
      const operationId = `fake-${String(byKey.size + 1).padStart(4, "0")}`;
      byKey.set(submission.idempotencyKey, { operationId, submission: validation.value });
      bySnapshot.set(submission.snapshotId, operationId);
      // What a Git provider would write: one file per entry plus the snapshot record.
      const entries = snapshot.project.providers.content.flatMap((provider) => provider.entries);
      submissions.push({ operationId, submission: validation.value, files: [...entries.map((entry) => `content/entries/${entry.modelId}/${entry.id}.json`), "content/snapshot.json"] });
      observations.set(operationId, { state: "submitted", snapshotId: submission.snapshotId, baselineRevision: submission.baselineRevision, observedAt: now() });
      if (outcome === "lost-ack") return { status: "timeout", message: "fake provider lost the acknowledgement" };
      return { status: "ok", ref: ref(operationId), replayed: false };
    },
    async status(target) {
      calls.status += 1;
      const outcome = scripted.status.shift();
      if (outcome === "timeout" || outcome === "unavailable") return { status: outcome, message: `fake provider ${outcome}` };
      if (target.providerId !== providerId) return { status: "not-found" };
      const observation = observations.get(target.operationId);
      return observation ? { status: "ok", value: structuredClone(observation) } : { status: "not-found" };
    },
    async lookupExisting(snapshotId) {
      calls.lookupExisting += 1;
      const outcome = scripted.lookupExisting.shift();
      if (outcome === "timeout" || outcome === "unavailable") return { status: outcome, message: `fake provider ${outcome}` };
      const operationId = bySnapshot.get(snapshotId);
      return operationId ? { status: "ok", ref: ref(operationId) } : { status: "not-found" };
    },
    // Merges only a submission whose evidence verifies (every check passed), like branch rules would.
    async promote(target) {
      calls.promote += 1;
      const outcome = scripted.promote.shift();
      if (outcome === "timeout" || outcome === "unavailable") return { status: outcome, message: `fake provider ${outcome}` };
      if (outcome === "rejected") return { status: "refused", message: "fake provider refused the merge" };
      const observation = observations.get(target.operationId);
      if (!observation) return { status: "refused", message: "unknown submission" };
      const checks = observation.evidence?.checks ?? [];
      if (observation.state !== "verified" || !observation.evidence?.commit || checks.length === 0 || checks.some((check) => check.status !== "passed")) return { status: "refused", message: `not every required check passed (${observation.state})` };
      merges += 1;
      const commit = String(merges).padStart(40, "c");
      observations.set(target.operationId, { ...observation, state: "integrated", evidence: { ...observation.evidence, commit }, observedAt: now() });
      return { status: "ok", commit };
    },
    advance(operationId, state, details = {}) {
      const observation = observations.get(operationId);
      if (!observation) throw new Error(`Unknown fake submission "${operationId}".`);
      const { message: _previous, ...rest } = observation;
      observations.set(operationId, { ...rest, state, ...(details.evidence ? { evidence: structuredClone(details.evidence) } : {}), ...(details.message ? { message: details.message } : {}), observedAt: now() });
    },
  };
}
