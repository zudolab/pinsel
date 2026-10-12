import type { ContentExportState } from "zudo-composer/export";
import type { AdminHandler } from "../app";
import { json, readJson } from "../api/handlers";
import type { PublicationEvidence } from "../publish/port";
import type { FakeOutcome, FakePublicationProvider } from "../publish/fake-provider";

// `/admin/fake-publisher`, compiled only into the local entry (src/local-dev.ts),
// so a browser run under `wrangler dev --env local` can play the remote
// provider: list what was submitted, queue scripted failures and move a
// submission through the upstream export states. The Worker still decides
// every Pinsel state from these observations through its evidence guard.

const STATES: readonly ContentExportState[] = ["submitted", "building", "verified", "integrated", "deployed", "failed", "conflict"];
const METHODS = ["submit", "status", "lookupExisting", "promote"] as const;
const OUTCOMES: readonly FakeOutcome[] = ["timeout", "unavailable", "lost-ack", "rejected"];

export function fakePublisherHandler(fake: FakePublicationProvider): AdminHandler {
  return async (request, url) => {
    if (url.pathname === "/admin/fake-publisher" && request.method === "GET") {
      return json({ status: "ok", value: { calls: fake.calls, submissions: fake.submissions.map(({ operationId, submission, files }) => ({ operationId, snapshotId: submission.snapshotId, baselineRevision: submission.baselineRevision, idempotencyKey: submission.idempotencyKey, files })) } });
    }
    if (url.pathname === "/admin/fake-publisher/script" && request.method === "POST") {
      const input = await readJson(request);
      const method = METHODS.find((candidate) => candidate === input?.method);
      const outcome = OUTCOMES.find((candidate) => candidate === input?.outcome);
      if (!method || !outcome) return json({ status: "rejected", message: `method must be one of ${METHODS.join(", ")} and outcome one of ${OUTCOMES.join(", ")}.` }, 422);
      fake.script(method, outcome);
      return json({ status: "ok", value: { method, outcome } });
    }
    if (url.pathname === "/admin/fake-publisher/advance" && request.method === "POST") {
      const input = await readJson(request);
      const state = STATES.find((candidate) => candidate === input?.state);
      if (typeof input?.operationId !== "string" || !state) return json({ status: "rejected", message: `operationId and a state (${STATES.join(", ")}) are required.` }, 422);
      try {
        fake.advance(input.operationId, state, { ...(input.evidence ? { evidence: input.evidence as PublicationEvidence } : {}), ...(typeof input.message === "string" ? { message: input.message } : {}) });
      } catch (error) {
        return json({ status: "not-found", message: error instanceof Error ? error.message : String(error) }, 404);
      }
      return json({ status: "ok", value: { operationId: input.operationId, state } });
    }
    return null;
  };
}
