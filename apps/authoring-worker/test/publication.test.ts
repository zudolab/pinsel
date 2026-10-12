import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createFakePublicationProvider, type FakePublicationProvider } from "../src/publish/fake-provider";
import { isPublishablePath, publicationStateFor, selectPublisher } from "../src/publish/port";
import { resetD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";
import { COMMIT_1, app, call, savePrice, snapshotNow, type Handler, type TestEnv } from "./helpers";

const FAKE_ENV: TestEnv = { ...env, PUBLISHER_PROVIDER: "fake" };

let fake: FakePublicationProvider;
let handler: Handler;

beforeEach(async () => {
  await resetD1ContentDraftStorage(env.DB);
  fake = createFakePublicationProvider({ now: () => "2026-10-13T00:00:00.000Z" });
  handler = app("editor@example.test", { publishers: { fake: () => fake } });
});

async function publish(snapshot: { snapshotId: string; baselineRevision: string }, callEnv: TestEnv = FAKE_ENV) {
  return call(handler, "/api/v1/publications", { method: "POST", env: callEnv, json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: snapshot.baselineRevision } });
}

describe("publication provider selection", () => {
  it("fails closed with configuration-required unless a registered provider and a valid promotion policy are configured", () => {
    const factories = { fake: () => fake };
    expect(selectPublisher({}, factories)).toMatchObject({ ok: false, code: "configuration-required" });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "disabled" }, factories)).toMatchObject({ ok: false });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "github" }, factories)).toMatchObject({ ok: false });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "fake", PROMOTION_POLICY: "yolo" }, factories)).toMatchObject({ ok: false });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "fake", PROMOTION_POLICY: "auto" }, { fake: () => null })).toMatchObject({ ok: false });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "fake" }, factories)).toMatchObject({ ok: true, config: { promotionPolicy: "manual" } });
  });

  it("answers configuration-required by default (PUBLISHER_PROVIDER=disabled) and creates no job", async () => {
    await savePrice(handler, "¥55,000");
    const snapshot = await snapshotNow(handler);
    const result = await publish(snapshot, env);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ status: "unavailable", code: "configuration-required", state: "configuration-required" });
    expect((await call(handler, "/api/v1/site")).body.publication).toMatchObject({ state: "configuration-required" });
    expect(fake.calls.submit).toBe(0);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM jobs").first<{ n: number }>())?.n).toBe(0);
  });
});

describe("publication jobs with the fake provider", () => {
  it("submits a snapshot once with its exact base and package identity; a duplicate request returns the same job", async () => {
    await savePrice(handler, "¥55,000");
    const snapshot = await snapshotNow(handler);
    const first = await publish(snapshot);
    expect(first.status).toBe(200);
    expect(first.body.value).toMatchObject({ snapshotId: snapshot.snapshotId, baselineRevision: snapshot.baselineRevision, state: "submitted", providerId: "fake", attempts: 1, requestedBy: "editor@example.test" });
    expect(first.body.value.providerRef.operationId).toBe("fake-0001");
    expect(fake.submissions).toHaveLength(1);
    expect(fake.submissions[0]!.submission).toEqual({ snapshotId: snapshot.snapshotId, projectRevision: snapshot.snapshotId, baselineRevision: snapshot.baselineRevision, packageIdentity: { packId: "pinsel", packVersion: "0.1.0", contractVersion: 2 }, idempotencyKey: first.body.value.publicationId });
    expect(fake.submissions[0]!.files.every(isPublishablePath)).toBe(true);

    const again = await publish(snapshot);
    expect(again.body).toMatchObject({ status: "ok", replayed: true, value: { publicationId: first.body.value.publicationId } });
    // A second session asking for the same snapshot also gets the same job.
    const other = await call(app("second@example.test", { publishers: { fake: () => fake } }), "/api/v1/publications", { method: "POST", env: FAKE_ENV, json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: snapshot.baselineRevision } });
    expect(other.body.value.publicationId).toBe(first.body.value.publicationId);
    expect(fake.calls.submit).toBe(1);
  });

  it("reports only what the provider's evidence proves", async () => {
    const snapshot = await snapshotNow(handler);
    const id = (await publish(snapshot)).body.value.publicationId as string;
    const state = async () => (await call(handler, `/api/v1/publications/${id}`, { env: FAKE_ENV })).body.value.state as string;
    expect(await state()).toBe("submitted");
    fake.advance("fake-0001", "building");
    expect(await state()).toBe("building");
    fake.advance("fake-0001", "verified", { evidence: { commit: COMMIT_1, checks: [{ name: "publication-validate", status: "pending" }] } });
    expect(await state()).toBe("building");
    fake.advance("fake-0001", "verified", { evidence: { checks: [{ name: "publication-validate", status: "passed" }] } });
    expect(await state()).toBe("building");
    fake.advance("fake-0001", "verified", { evidence: { commit: COMMIT_1, pr: "17", checks: [{ name: "publication-validate", status: "passed" }] } });
    expect(await state()).toBe("validated");
    fake.advance("fake-0001", "integrated", { evidence: { pr: "17" } });
    expect(await state()).toBe("building");
    fake.advance("fake-0001", "integrated", { evidence: { commit: COMMIT_1, pr: "17" } });
    expect(await state()).toBe("integrated");
    fake.advance("fake-0001", "deployed", { evidence: { commit: COMMIT_1 } });
    expect(await state()).toBe("integrated");
    fake.advance("fake-0001", "deployed", { evidence: { commit: COMMIT_1, deployment: { deploymentId: "d-1", commit: "f".repeat(40), observedAt: "2026-10-13T00:00:00.000Z" } } });
    expect(await state()).toBe("integrated");
    fake.advance("fake-0001", "deployed", { evidence: { commit: COMMIT_1, deployment: { deploymentId: "d-1", commit: COMMIT_1, observedAt: "2026-10-13T00:00:00.000Z" } } });
    expect(await state()).toBe("live");
    // Terminal: a later provider claim does not move it.
    fake.advance("fake-0001", "failed");
    expect(await state()).toBe("live");
  });

  it("maps every upstream export state (verified -> validated, deployed -> live) through the evidence guard", () => {
    const at = { snapshotId: "a".repeat(64), baselineRevision: "b", observedAt: "t" };
    expect(publicationStateFor({ ...at, state: "submitted" })).toBe("submitted");
    expect(publicationStateFor({ ...at, state: "failed" })).toBe("failed");
    expect(publicationStateFor({ ...at, state: "conflict" })).toBe("conflict");
    expect(publicationStateFor({ ...at, state: "verified", evidence: { commit: COMMIT_1, checks: [] } })).toBe("building");
    expect(publicationStateFor({ ...at, state: "deployed" })).toBe("building");
  });

  it("recovers a lost acknowledgement by lookup, never by a second submission", async () => {
    const snapshot = await snapshotNow(handler);
    fake.script("submit", "lost-ack");
    const lost = await publish(snapshot);
    expect(lost.status).toBe(503);
    expect(lost.body).toMatchObject({ status: "uncertain", value: { state: "submitted", providerRef: null, attempts: 1 } });
    expect(fake.submissions).toHaveLength(1);
    const recovered = await call(handler, `/api/v1/publications/${lost.body.operationId}`, { env: FAKE_ENV });
    expect(recovered.body.value.providerRef.operationId).toBe("fake-0001");
    expect(fake.calls).toMatchObject({ submit: 1, lookupExisting: 1 });
    expect(fake.submissions).toHaveLength(1);
  });

  it("retries a provider timeout under the same job and key", async () => {
    const snapshot = await snapshotNow(handler);
    fake.script("submit", "timeout");
    const timedOut = await publish(snapshot);
    expect(timedOut.body.status).toBe("uncertain");
    expect(fake.submissions).toHaveLength(0);
    const retried = await publish(snapshot);
    expect(retried.body).toMatchObject({ status: "ok", value: { publicationId: timedOut.body.operationId, attempts: 2 } });
    expect(fake.submissions).toHaveLength(1);
    // A status timeout is reported without changing the job.
    fake.script("status", "timeout");
    const status = await call(handler, `/api/v1/publications/${timedOut.body.operationId}`, { env: FAKE_ENV });
    expect(status.body.value).toMatchObject({ state: "submitted", message: expect.stringContaining("timeout") });
  });

  it("records a refused submission as failed, keeps the draft, and says configuration-required when the provider is switched off", async () => {
    const saved = await savePrice(handler, "¥57,000");
    const snapshot = await snapshotNow(handler);
    fake.script("submit", "rejected");
    const refused = await publish(snapshot);
    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({ status: "rejected", code: "provider-rejected", value: { state: "failed" } });
    const draft = await call(handler, "/api/v1/draft");
    expect(draft.body.value.draftRevision).toBe(saved);
    const off = await call(handler, `/api/v1/publications/${refused.body.value.publicationId}`);
    expect(off.body.value).toMatchObject({ state: "configuration-required", lastObservedState: "failed" });
  });

  it("refuses stale bases, unknown snapshots, extra fields and cross-origin requests", async () => {
    const snapshot = await snapshotNow(handler);
    const stale = await call(handler, "/api/v1/publications", { method: "POST", env: FAKE_ENV, json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: "older-baseline" } });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ status: "conflict", reason: "baseline-revision" });
    expect((await publish({ snapshotId: "0".repeat(64), baselineRevision: snapshot.baselineRevision })).status).toBe(404);
    const extra = await call(handler, "/api/v1/publications", { method: "POST", env: FAKE_ENV, json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: snapshot.baselineRevision, repository: "evil/repo" } });
    expect(extra.status).toBe(422);
    const crossSite = await call(handler, "/api/v1/publications", { method: "POST", env: FAKE_ENV, origin: "https://evil.example", json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: snapshot.baselineRevision } });
    expect(crossSite.status).toBe(403);
    expect((await call(handler, "/api/v1/publications/pub-unknown", { env: FAKE_ENV })).status).toBe(404);
    expect(fake.calls.submit).toBe(0);
  });

  it("never publishes on save", async () => {
    await savePrice(handler, "¥58,000", { env: FAKE_ENV });
    await snapshotNow(handler, FAKE_ENV);
    expect(fake.calls.submit).toBe(0);
  });
});
