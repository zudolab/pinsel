import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CONTENT_STORAGE_CONFORMANCE_POLICY, createContentStorageConformanceBaseline, runContentStorageConformance } from "zudo-composer/host-storage";
import { authorizeContentMutation } from "zudo-composer/content";

import { createD1ContentDraftStorage, resetD1ContentDraftStorage, seedD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";

const PROJECT = "conformance-site";

async function factory(baseline: Parameters<typeof seedD1ContentDraftStorage>[1]) {
  await resetD1ContentDraftStorage(env.DB);
  await seedD1ContentDraftStorage(env.DB, baseline, { projectId: baseline.project.id });
  return createD1ContentDraftStorage(env.DB, { projectId: baseline.project.id });
}

describe("D1 ContentDraftStorageAdapter", () => {
  describe("upstream conformance suite", () => {
    // Registers one vitest case per upstream conformance case against the real local D1.
    void runContentStorageConformance(factory, { test: it });
  });

  it("a losing CAS leaves no revision, receipt, history row or entry change in D1 itself", async () => {
    const baseline = createContentStorageConformanceBaseline("baseline-1");
    const adapter = await factory(baseline);
    const draft = await adapter.readDraft();
    if (draft.status !== "ok") throw new Error("seeded draft must read");
    const actor = { subject: "conformance@example.test" };
    const authorized = authorizeContentMutation(CONTENT_STORAGE_CONFORMANCE_POLICY, actor, { kind: "put-entry-values", projectId: PROJECT, providerId: "content-filesystem", modelId: "notes", entryId: "first", expectedRevision: draft.value.draftRevision, values: { title: "Lost" } }, draft.value.snapshot);
    if (!authorized.ok) throw new Error(authorized.message);
    const stale = await adapter.apply({ operationId: "op-stale", actor, mutation: { ...authorized.mutation, expectedMutationToken: draft.value.draftRevision + 5 }, expectedDraftRevision: draft.value.draftRevision + 5, expectedBaselineRevision: "baseline-1" });
    expect(stale.status).toBe("conflict");
    const counts = await env.DB.batch<{ n: number }>([
      env.DB.prepare("SELECT COUNT(*) AS n FROM operations"),
      env.DB.prepare("SELECT COUNT(*) AS n FROM revisions"),
      env.DB.prepare("SELECT draft_revision AS n FROM draft_state WHERE project_id = ?").bind(PROJECT),
      env.DB.prepare("SELECT COUNT(*) AS n FROM draft_entries WHERE record_json LIKE '%Lost%'"),
    ]);
    expect(counts.map((result) => result.results[0]?.n)).toEqual([0, 1, draft.value.draftRevision, 0]);
  });

  it("persists the caller's requestDigest on the receipt", async () => {
    const baseline = createContentStorageConformanceBaseline("baseline-1");
    const adapter = await factory(baseline);
    const draft = await adapter.readDraft();
    if (draft.status !== "ok") throw new Error("seeded draft must read");
    const actor = { subject: "conformance@example.test" };
    const authorized = authorizeContentMutation(CONTENT_STORAGE_CONFORMANCE_POLICY, actor, { kind: "put-entry-values", projectId: PROJECT, providerId: "content-filesystem", modelId: "notes", entryId: "first", expectedRevision: draft.value.draftRevision, values: { title: "Digest" } }, draft.value.snapshot);
    if (!authorized.ok) throw new Error(authorized.message);
    const digest = "a".repeat(64);
    const applied = await adapter.apply({ operationId: "op-digest", actor, mutation: authorized.mutation, expectedDraftRevision: draft.value.draftRevision, expectedBaselineRevision: "baseline-1", requestDigest: digest });
    expect(applied.status).toBe("ok");
    const stored = await env.DB.prepare("SELECT request_digest FROM operations WHERE operation_id = ?").bind("op-digest").first<{ request_digest: string }>();
    expect(stored?.request_digest).toBe(digest);
    const receipt = await adapter.readReceipt("op-digest");
    expect(receipt.status === "ok" && receipt.value.requestDigest).toBe(digest);
  });
});
