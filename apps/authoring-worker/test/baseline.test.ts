import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createFakePublicationProvider, type FakePublicationProvider } from "../src/publish/fake-provider";
import { BASELINE, PINSEL_SITE } from "../src/site/baseline";
import { resetD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";
import { COMMIT_1, COMMIT_2, PRICE, app, call, canonicalWith, priceOf, putPrice, readDraft, savePrice, snapshotNow, type Handler, type TestEnv } from "./helpers";

const FAKE_ENV: TestEnv = { ...env, PUBLISHER_PROVIDER: "fake" };
const INTEGRATED = (commit: string) => ({ evidence: { commit, pr: "17", checks: [{ name: "publication-validate", status: "passed" as const }] } });

let fake: FakePublicationProvider;
let handler: Handler;

beforeEach(async () => {
  await resetD1ContentDraftStorage(env.DB);
  fake = createFakePublicationProvider();
  handler = app("editor@example.test", { publishers: { fake: () => fake } });
});

async function publish(snapshot: { snapshotId: string; baselineRevision: string }, target = handler) {
  const result = await call(target, "/api/v1/publications", { method: "POST", env: FAKE_ENV, json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: snapshot.baselineRevision } });
  expect(result.body.status, JSON.stringify(result.body)).toBe("ok");
  return result.body.value as { publicationId: string; providerRef: { operationId: string } };
}

function advance(publicationId: string, target = handler, body: Record<string, unknown> = { publicationId }) {
  return call(target, "/api/v1/baseline/advance", { method: "POST", env: FAKE_ENV, json: body });
}

describe("baseline advance from provider evidence", () => {
  it("advances a clean draft to the integrated commit and records the evidence; a retry is a replay", async () => {
    await savePrice(handler, "¥55,000");
    const snapshot = await snapshotNow(handler);
    const job = await publish(snapshot);
    fake.advance(job.providerRef.operationId, "integrated", INTEGRATED(COMMIT_1));
    const advanced = await advance(job.publicationId);
    expect(advanced.status).toBe(200);
    expect(advanced.body.value).toMatchObject({ replayed: false, baseline: { gitSha: COMMIT_1, contentDigest: snapshot.snapshotId, packageIdentity: { packId: "pinsel", packVersion: "0.1.0" } }, draft: { baselineRevision: COMMIT_1, draftRevision: snapshot.draftRevision + 1 } });
    const draft = await readDraft(handler);
    expect(priceOf(draft)).toBe("¥55,000");
    expect((await call(handler, "/api/v1/site")).body.baselineRevision).toBe(COMMIT_1);
    const baseline = await call(handler, "/api/v1/baseline");
    expect(baseline.body.value.evidence).toMatchObject({ publicationId: job.publicationId, gitSha: COMMIT_1, contentDigest: snapshot.snapshotId });
    const replay = await advance(job.publicationId);
    expect(replay.body).toMatchObject({ status: "ok", value: { replayed: true } });
    expect((await readDraft(handler)).draftRevision).toBe(draft.draftRevision);
  });

  it("keeps an edit made while the publication was building, and a second publication carries it", async () => {
    await savePrice(handler, "¥55,000");
    const first = await snapshotNow(handler);
    const job1 = await publish(first);
    fake.advance(job1.providerRef.operationId, "building");
    // Edit during publication 1.
    await savePrice(handler, "¥56,000", { entryId: "four-month" });
    fake.advance(job1.providerRef.operationId, "integrated", INTEGRATED(COMMIT_1));
    const advanced = await advance(job1.publicationId);
    expect(advanced.body.status).toBe("ok");
    const draft = await readDraft(handler);
    expect(draft.baselineRevision).toBe(COMMIT_1);
    expect(priceOf(draft)).toBe("¥55,000");
    expect(priceOf(draft, "four-month")).toBe("¥56,000");
    // The first snapshot is unchanged.
    const frozen = await call(handler, `/api/v1/snapshots/${first.snapshotId}`);
    expect(frozen.body.value.project.providers.content[0].entries.find((entry: { id: string }) => entry.id === "four-month").values[PRICE]).not.toBe("¥56,000");

    const second = await snapshotNow(handler);
    expect(second.baselineRevision).toBe(COMMIT_1);
    const job2 = await publish(second);
    expect(job2.publicationId).not.toBe(job1.publicationId);
    expect(fake.submissions[1]!.submission.baselineRevision).toBe(COMMIT_1);
    fake.advance(job2.providerRef.operationId, "integrated", INTEGRATED(COMMIT_2));
    expect((await advance(job2.publicationId)).body.value.draft.baselineRevision).toBe(COMMIT_2);
    expect(priceOf(await readDraft(handler), "four-month")).toBe("¥56,000");
  });

  it("refuses to advance without integration evidence or with a caller-supplied sha, and fails closed when disabled", async () => {
    const job = await publish(await snapshotNow(handler));
    const early = await advance(job.publicationId);
    expect(early.status).toBe(422);
    expect(early.body).toMatchObject({ status: "rejected", code: "not-integrated" });
    fake.advance(job.providerRef.operationId, "integrated", { evidence: { pr: "17" } });
    expect((await advance(job.publicationId)).body.code).toBe("not-integrated");
    const smuggled = await advance(job.publicationId, handler, { publicationId: job.publicationId, gitSha: COMMIT_1 });
    expect(smuggled.status).toBe(422);
    expect(smuggled.body.message).toContain("gitSha");
    const disabled = await call(handler, "/api/v1/baseline/advance", { method: "POST", json: { publicationId: job.publicationId } });
    expect(disabled.body).toMatchObject({ status: "unavailable", code: "configuration-required" });
    expect((await readDraft(handler)).baselineRevision).toBe(BASELINE.baselineRevision);
  });

  it("marks an in-flight publication conflict once another publication moved the base", async () => {
    await savePrice(handler, "¥55,000");
    const job1 = await publish(await snapshotNow(handler));
    await savePrice(handler, "¥56,000", { entryId: "four-month" });
    const job2 = await publish(await snapshotNow(handler));
    fake.advance(job1.providerRef.operationId, "integrated", INTEGRATED(COMMIT_1));
    expect((await advance(job1.publicationId)).body.status).toBe("ok");
    const stale = await call(handler, `/api/v1/publications/${job2.publicationId}`, { env: FAKE_ENV });
    expect(stale.body.value).toMatchObject({ state: "conflict", message: expect.stringContaining(COMMIT_1) });
    // The newer edit is still the draft, ready to snapshot again on the new base.
    expect(priceOf(await readDraft(handler), "four-month")).toBe("¥56,000");
  });

  it("races a save against the advance: the save either lands and survives as the draft, or loses with a conflict", async () => {
    const snapshot = await snapshotNow(handler);
    const job = await publish(snapshot);
    fake.advance(job.providerRef.operationId, "integrated", INTEGRATED(COMMIT_1));
    const other = app("second@example.test", { publishers: { fake: () => fake } });
    const draft = await readDraft(handler);
    const [saved, advanced] = await Promise.all([
      call(other, "/api/v1/operations", { method: "POST", json: { operationId: "op-race", request: putPrice(draft.draftRevision, "¥61,000"), expectedBaselineRevision: draft.baselineRevision } }),
      advance(job.publicationId),
    ]);
    expect(advanced.body.status).toBe("ok");
    const after = await readDraft(handler);
    expect(after.baselineRevision).toBe(COMMIT_1);
    if (saved.body.status === "ok") expect(priceOf(after)).toBe("¥61,000");
    else {
      expect(saved.body).toMatchObject({ status: "conflict", reason: "baseline-revision" });
      expect(priceOf(after)).toBe("¥50,000");
    }
  });

  it("races a save against snapshot creation: the snapshot holds exactly the revision it names", async () => {
    const draft = await readDraft(handler);
    const other = app("second@example.test");
    const [saved, snapshot] = await Promise.all([
      call(other, "/api/v1/operations", { method: "POST", json: { operationId: "op-snap-race", request: putPrice(draft.draftRevision, "¥62,000"), expectedBaselineRevision: draft.baselineRevision } }),
      call(handler, "/api/v1/snapshots", { method: "POST", json: { expectedDraftRevision: draft.draftRevision } }),
    ]);
    expect(saved.body.status).toBe("ok");
    if (snapshot.body.status === "ok") {
      expect(snapshot.body.value.draftRevision).toBe(draft.draftRevision);
      expect(snapshot.body.value.project.providers.content[0].entries.find((entry: { id: string }) => entry.id === "two-month").values[PRICE]).toBe("¥50,000");
    } else {
      expect(snapshot.body).toMatchObject({ status: "conflict", reason: "draft-revision" });
    }
  });
});

describe("canonical reconcile", () => {
  const withCanonical = (revision: string, prices: Record<string, string> = {}) => app("editor@example.test", { site: { ...PINSEL_SITE, canonical: canonicalWith(revision, prices) } });

  async function seedThroughDefault() {
    // Seed from the bundled baseline first, as the deployed Worker did before the canonical source changed.
    await readDraft(handler);
  }

  function reconcile(target: Handler, body: Record<string, unknown> = {}) {
    return call(target, "/api/v1/baseline/reconcile", { method: "POST", json: body });
  }

  it("is in sync with the bundled baseline, and ignores a bundle the store already moved past", async () => {
    expect((await reconcile(handler)).body.value).toMatchObject({ state: "in-sync", baselineRevision: BASELINE.baselineRevision });
    expect((await reconcile(withCanonical("external-1", { "four-month": "¥99,000" }))).body.value.state).toBe("rebased");
    expect((await reconcile(handler)).body.value).toMatchObject({ state: "behind", baselineRevision: "external-1" });
  });

  it("adopts a new commit with unchanged content and keeps unsent edits", async () => {
    await savePrice(handler, "¥55,000");
    const result = await reconcile(withCanonical("code-only-1"));
    expect(result.body.value).toMatchObject({ state: "rebased", kind: "identity", baselineRevision: "code-only-1" });
    const draft = await readDraft(handler);
    expect(draft.baselineRevision).toBe("code-only-1");
    expect(priceOf(draft)).toBe("¥55,000");
  });

  it("fast-forwards a draft without unsent edits", async () => {
    await seedThroughDefault();
    const result = await reconcile(withCanonical("external-1", { "two-month": "¥60,000" }));
    expect(result.body.value).toMatchObject({ state: "rebased", kind: "fast-forward" });
    expect(priceOf(await readDraft(handler))).toBe("¥60,000");
  });

  it("records a recoverable conflict for unsent edits and rebases non-overlapping changes on request", async () => {
    await savePrice(handler, "¥55,000");
    const external = withCanonical("external-1", { "four-month": "¥99,000" });
    const detected = await reconcile(external);
    expect(detected.status).toBe(409);
    expect(detected.body).toMatchObject({ status: "conflict", reason: "baseline-revision", conflict: { storedBaselineRevision: BASELINE.baselineRevision, canonicalBaselineRevision: "external-1", conflicts: [] } });
    const conflictId = detected.body.conflict.conflictId as string;
    expect((await call(handler, "/api/v1/baseline")).body.value.openConflicts).toHaveLength(1);
    // Saving continues on the stored baseline meanwhile; nothing was overwritten.
    expect(priceOf(await readDraft(handler))).toBe("¥55,000");
    const stale = await reconcile(external, { conflictId, expectedDraftRevision: 1 });
    expect(stale.body).toMatchObject({ status: "conflict", reason: "draft-revision" });
    const rebased = await reconcile(external, { conflictId, expectedDraftRevision: detected.body.current.draftRevision });
    expect(rebased.body.value).toMatchObject({ state: "rebased", kind: "merge", baselineRevision: "external-1" });
    const draft = await readDraft(handler);
    expect(priceOf(draft)).toBe("¥55,000");
    expect(priceOf(draft, "four-month")).toBe("¥99,000");
    expect((await call(handler, "/api/v1/baseline")).body.value.openConflicts).toHaveLength(0);
    // The editor saves against the new baseline.
    await savePrice(handler, "¥56,000");
  });

  it("lists field conflicts and resolves them only with an explicit preference", async () => {
    await savePrice(handler, "¥55,000");
    const external = withCanonical("external-1", { "two-month": "¥60,000" });
    const detected = await reconcile(external);
    expect(detected.body.conflict.conflicts).toEqual([{ kind: "field", entryId: "two-month", modelId: "course", fieldId: PRICE, base: "¥50,000", draft: "¥55,000", canonical: "¥60,000" }]);
    const resolution = { conflictId: detected.body.conflict.conflictId, expectedDraftRevision: detected.body.current.draftRevision };
    const unresolved = await reconcile(external, resolution);
    expect(unresolved.status).toBe(409);
    expect(unresolved.body.conflict.conflicts).toHaveLength(1);
    expect((await reconcile(external, { ...resolution, prefer: "sideways" })).status).toBe(422);
    const kept = await reconcile(external, { ...resolution, prefer: "draft" });
    expect(kept.body.value.state).toBe("rebased");
    expect(priceOf(await readDraft(handler))).toBe("¥55,000");
  });
});
