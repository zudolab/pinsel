import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createFakePublicationProvider, type FakePublicationProvider } from "../src/publish/fake-provider";
import { githubPublisherFactory } from "../src/publish/github-provider";
import { IDENTITY_CHECK_NAME, formatIdentityReport, serializeSnapshotRecord, type SnapshotRecordFile } from "../src/publish/publication-record";
import { reconcileScheduled } from "../src/publish/reconcile";
import { PUBLICATION_PACKAGE_IDENTITY } from "../src/publish/snapshot-files";
import { BASELINE, PINSEL_SITE } from "../src/site/baseline";
import { resetD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";
import { checkRun, checkRuns, createReplay, fixture, type Replay } from "./github-replay";
import { COMMIT_1, COMMIT_2, PRICE, app, call, canonicalWith, priceOf, readDraft, savePrice, snapshotNow, type Handler, type TestEnv } from "./helpers";

// The publication scenarios of the publication sub-issue, end to end through
// the HTTP API on a real local D1: (a)–(f), (h) with the fake provider; (i)–(k)
// and auto promotion with the GitHub provider on recorded responses.

const FAKE_ENV: TestEnv = { ...env, PUBLISHER_PROVIDER: "fake" };
const AUTO_ENV: TestEnv = { ...FAKE_ENV, PROMOTION_POLICY: "auto" };
const GREEN = (commit: string) => ({ evidence: { commit, pr: "17", checks: [{ name: "content-validate", status: "passed" as const }] } });

let fake: FakePublicationProvider;
let handler: Handler;

beforeEach(async () => {
  await resetD1ContentDraftStorage(env.DB);
  fake = createFakePublicationProvider({ now: () => "2026-10-13T00:00:00.000Z" });
  handler = app("editor@example.test", { publishers: { fake: () => fake } });
});

async function publish(snapshot: { snapshotId: string; baselineRevision: string }, target = handler, callEnv: TestEnv = FAKE_ENV) {
  return call(target, "/api/v1/publications", { method: "POST", env: callEnv, json: { snapshotId: snapshot.snapshotId, expectedBaselineRevision: snapshot.baselineRevision } });
}

async function published(snapshot: { snapshotId: string; baselineRevision: string }, target = handler, callEnv: TestEnv = FAKE_ENV) {
  const result = await publish(snapshot, target, callEnv);
  expect(result.body.status, JSON.stringify(result.body)).toBe("ok");
  return result.body.value as { publicationId: string; providerRef: { operationId: string } };
}

async function job(id: string, target = handler, callEnv: TestEnv = FAKE_ENV) {
  const result = await call(target, `/api/v1/publications/${id}`, { env: callEnv });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return result.body.value as Record<string, any>;
}

describe("publication scenarios (fake provider, local D1)", () => {
  it("(a) runs two consecutive publications; each integration advances the baseline from the provider's commit", async () => {
    await savePrice(handler, "¥55,000");
    const first = await published(await snapshotNow(handler));
    fake.advance(first.providerRef.operationId, "verified", GREEN("a".repeat(40)));
    expect((await job(first.publicationId)).state).toBe("validated");
    // Manual policy: validated stays validated until a human merges.
    expect((await job(first.publicationId)).state).toBe("validated");
    expect(fake.calls.promote).toBe(0);
    fake.advance(first.providerRef.operationId, "integrated", GREEN(COMMIT_1));
    expect(await job(first.publicationId)).toMatchObject({ state: "integrated", baselineAdvance: { status: "advanced", gitSha: COMMIT_1, replayed: false } });
    expect((await call(handler, "/api/v1/site")).body.baselineRevision).toBe(COMMIT_1);

    await savePrice(handler, "¥56,000", { entryId: "four-month" });
    const secondSnapshot = await snapshotNow(handler);
    expect(secondSnapshot.baselineRevision).toBe(COMMIT_1);
    const second = await published(secondSnapshot);
    fake.advance(second.providerRef.operationId, "integrated", GREEN(COMMIT_2));
    expect(await job(second.publicationId)).toMatchObject({ state: "integrated", baselineAdvance: { status: "advanced", gitSha: COMMIT_2 } });
    const draft = await readDraft(handler);
    expect(draft.baselineRevision).toBe(COMMIT_2);
    expect([priceOf(draft), priceOf(draft, "four-month")]).toEqual(["¥55,000", "¥56,000"]);
    // Re-reading an advanced job is a replay, not a second advance.
    expect(await job(first.publicationId)).toMatchObject({ baselineAdvance: { status: "advanced", replayed: true } });
  });

  it("(b) keeps an edit made while publication 1 is building, and publication 2 contains it", async () => {
    await savePrice(handler, "¥55,000");
    const first = await published(await snapshotNow(handler));
    fake.advance(first.providerRef.operationId, "building");
    expect((await job(first.publicationId)).state).toBe("building");
    await savePrice(handler, "¥57,000", { entryId: "four-month" });
    fake.advance(first.providerRef.operationId, "integrated", GREEN(COMMIT_1));
    expect((await job(first.publicationId)).baselineAdvance.status).toBe("advanced");
    const draft = await readDraft(handler);
    expect(priceOf(draft, "four-month")).toBe("¥57,000");
    const secondSnapshot = await snapshotNow(handler);
    const second = await published(secondSnapshot);
    const frozen = await call(handler, `/api/v1/snapshots/${secondSnapshot.snapshotId}`);
    expect(frozen.body.value.project.providers.content[0].entries.find((entry: { id: string }) => entry.id === "four-month").values[PRICE]).toBe("¥57,000");
    expect(fake.submissions[1]!.submission).toMatchObject({ snapshotId: secondSnapshot.snapshotId, baselineRevision: COMMIT_1 });
    expect(second.publicationId).not.toBe(first.publicationId);
  });

  it("(c) a build failure leaves the live baseline unchanged and the draft intact; a retry re-arms the same job", async () => {
    const saved = await savePrice(handler, "¥55,000");
    const snapshot = await snapshotNow(handler);
    const failed = await published(snapshot);
    fake.advance(failed.providerRef.operationId, "failed", { evidence: { commit: "a".repeat(40), checks: [{ name: "content-validate", status: "failed" }] }, message: "content-validate failed" });
    expect(await job(failed.publicationId)).toMatchObject({ state: "failed", message: "content-validate failed" });
    expect((await call(handler, "/api/v1/baseline")).body.value).toMatchObject({ baselineRevision: BASELINE.baselineRevision, evidence: null });
    const draft = await readDraft(handler);
    expect(draft).toMatchObject({ draftRevision: saved, baselineRevision: BASELINE.baselineRevision });
    expect(priceOf(draft)).toBe("¥55,000");
    // CI re-run on the provider side, then the editor asks again: same job, same key, no second submission.
    fake.advance(failed.providerRef.operationId, "verified", GREEN("a".repeat(40)));
    const retried = await publish(snapshot);
    expect(retried.body).toMatchObject({ status: "ok", value: { publicationId: failed.publicationId, state: "submitted", attempts: 2, message: null } });
    expect(fake.submissions).toHaveLength(1);
    expect((await job(failed.publicationId)).state).toBe("validated");
  });

  it("(d) a provider timeout is counted, never failed, and the next answer continues the same job", async () => {
    const created = await published(await snapshotNow(handler));
    fake.script("status", "timeout");
    expect(await job(created.publicationId)).toMatchObject({ state: "submitted", providerFailures: 1, reconcileAttempts: 1, message: expect.stringContaining("timeout") });
    fake.script("status", "unavailable");
    expect(await job(created.publicationId)).toMatchObject({ state: "submitted", providerFailures: 2 });
    fake.advance(created.providerRef.operationId, "building");
    expect(await job(created.publicationId)).toMatchObject({ publicationId: created.publicationId, state: "building", providerFailures: 0, reconcileAttempts: 3 });
    expect(fake.calls.submit).toBe(1);
  });

  it("(e) duplicate and concurrent requests for one snapshot return the same job", async () => {
    const snapshot = await snapshotNow(handler);
    const [left, right] = await Promise.all([publish(snapshot), publish(snapshot, app("second@example.test", { publishers: { fake: () => fake } }))]);
    expect(left.body.value.publicationId).toBe(right.body.value.publicationId);
    expect((await publish(snapshot)).body).toMatchObject({ status: "ok", replayed: true });
    expect(fake.calls.submit).toBe(1);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM jobs").first<{ n: number }>())?.n).toBe(1);
  });

  it("(f) an external canonical change marks the in-flight job conflict, the draft rebases, and the next publication goes out on the new base", async () => {
    await savePrice(handler, "¥55,000");
    const inFlight = await published(await snapshotNow(handler));
    const external = app("editor@example.test", { site: { ...PINSEL_SITE, canonical: canonicalWith(COMMIT_2, { "four-month": "¥99,000" }) }, publishers: { fake: () => fake } });
    const detected = await call(external, "/api/v1/baseline/reconcile", { method: "POST", json: {} });
    expect(detected.status).toBe(409);
    const rebased = await call(external, "/api/v1/baseline/reconcile", { method: "POST", json: { conflictId: detected.body.conflict.conflictId, expectedDraftRevision: detected.body.current.draftRevision } });
    expect(rebased.body.value).toMatchObject({ state: "rebased", baselineRevision: COMMIT_2 });
    expect(await job(inFlight.publicationId)).toMatchObject({ state: "conflict", message: expect.stringContaining(COMMIT_2) });
    const draft = await readDraft(handler);
    expect([priceOf(draft), priceOf(draft, "four-month")]).toEqual(["¥55,000", "¥99,000"]);
    const next = await snapshotNow(external);
    expect(next.baselineRevision).toBe(COMMIT_2);
    const republished = await published(next, external);
    expect(republished.publicationId).not.toBe(inFlight.publicationId);
    expect(fake.submissions.at(-1)!.submission.baselineRevision).toBe(COMMIT_2);
    // The conflicted job stays conflict; asking for its snapshot again does not resurrect it.
    expect((await job(inFlight.publicationId)).state).toBe("conflict");
  });

  it("(h) serializes concurrent reconciliations of one job: one provider observation, the other returns the stored job", async () => {
    const created = await published(await snapshotNow(handler));
    fake.advance(created.providerRef.operationId, "building");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const status = fake.status.bind(fake);
    let entered = 0;
    fake.status = async (ref) => {
      entered += 1;
      await gate;
      return status(ref);
    };
    const first = job(created.publicationId);
    while (entered === 0) await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await job(created.publicationId);
    expect(second).toMatchObject({ state: "submitted", reconciling: true });
    release();
    expect(await first).toMatchObject({ state: "building", reconcileAttempts: 1 });
    expect(entered).toBe(1);
    // The lease is released: the next pass observes again.
    expect((await job(created.publicationId)).reconcileAttempts).toBe(2);
  });

  it("promotes under PROMOTION_POLICY=auto only after every check passed, then advances from the provider's evidence", async () => {
    const auto = app("editor@example.test", { publishers: { fake: () => fake } });
    await savePrice(auto, "¥55,000");
    const created = await published(await snapshotNow(auto), auto, AUTO_ENV);
    fake.advance(created.providerRef.operationId, "verified", { evidence: { commit: "a".repeat(40), checks: [{ name: "content-validate", status: "pending" }] } });
    expect((await job(created.publicationId, auto, AUTO_ENV)).state).toBe("building");
    expect(fake.calls.promote).toBe(0);
    fake.script("promote", "rejected");
    fake.advance(created.providerRef.operationId, "verified", GREEN("a".repeat(40)));
    expect(await job(created.publicationId, auto, AUTO_ENV)).toMatchObject({ state: "validated", message: expect.stringContaining("Promotion refused") });
    const promoted = await job(created.publicationId, auto, AUTO_ENV);
    expect(fake.calls.promote).toBe(2);
    expect(promoted).toMatchObject({ state: "integrated", baselineAdvance: { status: "advanced" } });
    expect((await readDraft(auto)).baselineRevision).toBe(promoted.evidence.commit);
  });

  it("runs the scheduled pass only when PUBLICATION_RECONCILE_SCHEDULE=enabled and a provider is configured", async () => {
    const created = await published(await snapshotNow(handler));
    fake.advance(created.providerRef.operationId, "verified", GREEN("a".repeat(40)));
    const publishers = { fake: () => fake };
    expect(await reconcileScheduled({ ...FAKE_ENV }, PINSEL_SITE, publishers)).toEqual({ ran: false, results: [] });
    expect(await reconcileScheduled({ ...env, PUBLICATION_RECONCILE_SCHEDULE: "enabled" }, PINSEL_SITE, publishers)).toEqual({ ran: false, results: [] });
    expect(await reconcileScheduled({ ...FAKE_ENV, PUBLICATION_RECONCILE_SCHEDULE: "enabled" }, PINSEL_SITE, publishers)).toEqual({ ran: true, results: [{ publicationId: created.publicationId, state: "validated" }] });
  });
});

// --- GitHub provider through the API, recorded responses only ---

const HEAD_SHA = "c0de".repeat(10);
const PUSHED_SHA = "0dd0".repeat(10);
const MERGE_SHA = "0e1d".repeat(10);
const PR = 42;
const GITHUB_ENV = { ...env, PUBLISHER_PROVIDER: "github", PUBLISHER_GITHUB_REPOSITORY: "zudolab/pinsel", PUBLISHER_GITHUB_TOKEN: "test-token-not-a-secret" } as TestEnv;

describe("publication scenarios (GitHub provider, recorded responses)", () => {
  const base = BASELINE.baselineRevision;
  let replay: Replay;
  let github: Handler;

  beforeEach(() => {
    replay = createReplay();
    github = app("editor@example.test", { publishers: { github: githubPublisherFactory({ fetch: replay.fetch, now: () => "2026-10-13T00:00:00.000Z" }) } });
  });

  function routes(snapshotId: string) {
    const branch = `content/${snapshotId}`;
    const head = encodeURIComponent(`zudolab:${branch}`);
    const pull = (kind: "open" | "merged" | "closed", headSha = HEAD_SHA) => fixture(`pull-${kind}`, { PR, BRANCH: branch, PR_HEAD_SHA: headSha, PR_BASE_REF: "main", BASE_SHA: base, TEST_MERGE_SHA: "7e57".repeat(10), MERGE_SHA });
    const record: SnapshotRecordFile = { snapshotId, baselineGitSha: base, contentDigest: snapshotId, packageIdentity: PUBLICATION_PACKAGE_IDENTITY, requestedBy: "editor@example.test", requestedAt: "2026-10-13T00:00:00.000Z" };
    const snapshotFile = fixture("contents-file", { FILE_NAME: "snapshot.json", FILE_PATH: "content/snapshot.json", FILE_TEXT: serializeSnapshotRecord(record) });
    return {
      record,
      pull,
      /** The first submission: nothing exists yet. */
      submit() {
        replay
          .on("GET", `/pulls?head=${head}&state=all&per_page=20`, { status: 200, body: [] })
          .on("GET", `/git/ref/heads/${branch}`, { status: 404, body: fixture("not-found") })
          .on("GET", `/git/commits/${base}`, { status: 200, body: fixture("git-commit-base", { BASE_SHA: base, BASE_TREE: "7ee0".repeat(10) }) })
          .on("GET", `/contents/content/entries/course/two-month.json?ref=${base}`, { status: 404, body: fixture("not-found") })
          .on("POST", "/git/trees", { status: 201, body: fixture("git-tree-created", { NEW_TREE: "7ee1".repeat(10) }) })
          .on("POST", "/git/commits", { status: 201, body: fixture("git-commit-created", { HEAD_SHA, NEW_TREE: "7ee1".repeat(10), BASE_SHA: base }) })
          .on("POST", "/git/refs", { status: 201, body: fixture("git-ref", { BRANCH: branch, HEAD_SHA }) })
          .on("GET", `/pulls?head=${head}&state=open&per_page=20`, { status: 200, body: [] })
          .on("POST", "/pulls", { status: 201, body: pull("open") });
      },
      open(runs: unknown[], headSha = HEAD_SHA) {
        replay
          .on("GET", `/pulls/${PR}`, { status: 200, body: pull("open", headSha) })
          .on("GET", `/compare/${base}...main`, { status: 200, body: fixture("compare", { BASE_SHA: base, COMPARE_STATUS: "identical", AHEAD_BY: 0, FILES: "[]" }) })
          .on("GET", `/commits/${HEAD_SHA}/check-runs?per_page=100`, { status: 200, body: checkRuns(runs) });
      },
      merged() {
        replay.on("GET", `/pulls/${PR}`, { status: 200, body: pull("merged") }).on("GET", `/contents/content/snapshot.json?ref=${MERGE_SHA}`, { status: 200, body: snapshotFile });
      },
      green: () => [checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), checkRun({ id: 900, name: IDENTITY_CHECK_NAME, headSha: HEAD_SHA, summary: formatIdentityReport({ snapshotId, contentDigest: snapshotId, headSha: HEAD_SHA, packageIdentity: PUBLICATION_PACKAGE_IDENTITY }) })],
    };
  }

  async function submitted() {
    await savePrice(github, "¥55,000");
    const snapshot = await snapshotNow(github);
    const r = routes(snapshot.snapshotId);
    r.submit();
    const created = await published(snapshot, github, GITHUB_ENV);
    expect(created.providerRef).toMatchObject({ providerId: "github", branch: `content/${snapshot.snapshotId}`, headSha: HEAD_SHA, pr: PR, baselineGitSha: base });
    return { snapshot, r, created };
  }

  it("writes only allowlisted paths for the snapshot, from the recorded base", async () => {
    const { snapshot } = await submitted();
    const tree = replay.writes().find((request) => request.path === "/git/trees")!;
    expect(tree.body.tree.map((item: { path: string }) => item.path)).toEqual(["content/entries/course/two-month.json", "content/snapshot.json"]);
    expect(replay.writes().find((request) => request.path === "/git/commits")!.body.parents).toEqual([base]);
    expect(JSON.parse(tree.body.tree[1].content)).toMatchObject({ snapshotId: snapshot.snapshotId, baselineGitSha: base, requestedBy: "editor@example.test" });
  });

  it("(i) a push to the content branch after submission is conflict, and the draft stays", async () => {
    const { r, created } = await submitted();
    r.open(r.green(), PUSHED_SHA);
    expect(await job(created.publicationId, github, GITHUB_ENV)).toMatchObject({ state: "conflict", message: expect.stringContaining(PUSHED_SHA) });
    expect(priceOf(await readDraft(github))).toBe("¥55,000");
  });

  it("(j) a PR closed without merging is failed with the reason, the draft stays, and a retry opens a new PR on the same branch", async () => {
    const { snapshot, r, created } = await submitted();
    replay.on("GET", `/pulls/${PR}`, { status: 200, body: r.pull("closed") });
    expect(await job(created.publicationId, github, GITHUB_ENV)).toMatchObject({ state: "failed", message: expect.stringContaining("closed without merging") });
    const draft = await readDraft(github);
    expect([draft.baselineRevision, priceOf(draft)]).toEqual([base, "¥55,000"]);
    // Retry: the closed PR is not reused; the branch is (it carries the snapshot).
    const branch = `content/${snapshot.snapshotId}`;
    const head = encodeURIComponent(`zudolab:${branch}`);
    replay
      .on("GET", `/pulls?head=${head}&state=all&per_page=20`, { status: 200, body: [r.pull("closed")] })
      .on("GET", `/git/ref/heads/${branch}`, { status: 200, body: fixture("git-ref", { BRANCH: branch, HEAD_SHA }) })
      .on("GET", `/contents/content/snapshot.json?ref=${HEAD_SHA}`, { status: 200, body: fixture("contents-file", { FILE_NAME: "snapshot.json", FILE_PATH: "content/snapshot.json", FILE_TEXT: serializeSnapshotRecord(r.record) }) });
    const before = replay.writes().length;
    const retried = await publish(snapshot, github, GITHUB_ENV);
    expect(retried.body).toMatchObject({ status: "ok", value: { publicationId: created.publicationId, state: "submitted" } });
    expect(replay.writes().slice(before).map((request) => `${request.method} ${request.path}`)).toEqual(["POST /pulls"]);
  });

  it("(k) pending, stale-head or unreported checks never yield validated; the exact green evidence does, and manual policy never merges", async () => {
    const { r, created } = await submitted();
    const state = async () => (await job(created.publicationId, github, GITHUB_ENV)).state;
    r.open([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA, status: "in_progress" })]);
    expect(await state()).toBe("building");
    r.open([checkRun({ id: 800, name: "content-validate", headSha: PUSHED_SHA }), checkRun({ id: 900, name: IDENTITY_CHECK_NAME, headSha: PUSHED_SHA })]);
    expect(await state()).toBe("submitted");
    r.open([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), checkRun({ id: 900, name: IDENTITY_CHECK_NAME, headSha: HEAD_SHA, summary: null })]);
    expect(await state()).toBe("building");
    r.open(r.green());
    expect(await state()).toBe("validated");
    expect(await state()).toBe("validated");
    expect(replay.requests.some((request) => request.method === "PUT")).toBe(false);
    // A maintainer merges: integrated only with the merge commit carrying the snapshot, then the baseline advances to it.
    r.merged();
    expect(await job(created.publicationId, github, GITHUB_ENV)).toMatchObject({ state: "integrated", evidence: { commit: MERGE_SHA }, baselineAdvance: { status: "advanced", gitSha: MERGE_SHA } });
    expect((await readDraft(github)).baselineRevision).toBe(MERGE_SHA);
  });

  it("merges under PROMOTION_POLICY=auto with the validated head sha, and integrates from the re-read PR", async () => {
    const { r, created } = await submitted();
    const autoEnv = { ...GITHUB_ENV, PROMOTION_POLICY: "auto" } as TestEnv;
    r.open(r.green());
    replay.on("PUT", `/pulls/${PR}/merge`, { status: 200, body: fixture("merge-ok", { MERGE_SHA }) });
    // The PR reads open for the observation and the pre-merge re-check, then merged.
    replay.on("GET", `/pulls/${PR}`, { status: 200, body: r.pull("open") }, { status: 200, body: r.pull("open") }, { status: 200, body: r.pull("merged") });
    replay.on("GET", `/contents/content/snapshot.json?ref=${MERGE_SHA}`, { status: 200, body: fixture("contents-file", { FILE_NAME: "snapshot.json", FILE_PATH: "content/snapshot.json", FILE_TEXT: serializeSnapshotRecord(r.record) }) });
    const result = await job(created.publicationId, github, autoEnv);
    expect(result).toMatchObject({ state: "integrated", evidence: { commit: MERGE_SHA }, baselineAdvance: { status: "advanced", gitSha: MERGE_SHA } });
    expect(replay.writes().find((request) => request.method === "PUT")!.body).toMatchObject({ sha: HEAD_SHA, merge_method: "merge" });
  });
});
