import { isPublishablePath } from "@pinsel/content";
import { describe, expect, it } from "vitest";
import { contentSnapshotId, type ContentSnapshotRecord } from "zudo-composer/host-storage";

import { createGitHubPublicationProvider, githubPublisherFactory } from "../src/publish/github-provider";
import { publicationStateFor, selectPublisher, type ProviderRef } from "../src/publish/port";
import { IDENTITY_CHECK_NAME, formatIdentityReport, parseSnapshotRecord, serializeSnapshotRecord, type SnapshotRecordFile } from "../src/publish/publication-record";
import { publicationPackageIdentity } from "../src/publish/snapshot-files";
import { BASELINE } from "../src/site/baseline";
import { checkRun, checkRuns, createReplay, fixture, type Replay } from "./github-replay";
import { PRICE } from "./helpers";

const PUBLICATION_PACKAGE_IDENTITY = publicationPackageIdentity();

const DISK = import.meta.glob("../../../content/entries/**/*.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const diskEntry = (model: string, id: string) => DISK[`../../../content/entries/${model}/${id}.json`]!;

const BASE_SHA = "ba5e".repeat(10);
const HEAD_SHA = "c0de".repeat(10);
const OTHER_SHA = "0dd0".repeat(10);
const MERGE_SHA = "0e1d".repeat(10);
const PR = 42;
const AT = "2026-10-13T00:00:00.000Z";

async function editedSnapshot(price = "¥55,000"): Promise<ContentSnapshotRecord> {
  const project = structuredClone(BASELINE.project);
  project.providers.content[0]!.entries.find((entry) => entry.id === "two-month")!.values[PRICE] = price;
  return { snapshotId: await contentSnapshotId(project), project, draftRevision: 2, baselineRevision: BASE_SHA, createdAt: AT };
}

function recordFor(snapshot: ContentSnapshotRecord): SnapshotRecordFile {
  return { snapshotId: snapshot.snapshotId, baselineGitSha: BASE_SHA, contentDigest: snapshot.snapshotId, packageIdentity: PUBLICATION_PACKAGE_IDENTITY, requestedBy: "editor@example.test", requestedAt: AT };
}

function submission(snapshot: ContentSnapshotRecord) {
  return { snapshotId: snapshot.snapshotId, projectRevision: snapshot.snapshotId, baselineRevision: BASE_SHA, packageIdentity: { packId: "pinsel", packVersion: "0.2.0", contractVersion: 2 }, idempotencyKey: `pub-${snapshot.snapshotId.slice(0, 32)}` };
}

function paths(snapshotId: string) {
  const branch = `content/${snapshotId}`;
  const head = encodeURIComponent(`zudolab:${branch}`);
  return {
    branch,
    pullsAll: `/pulls?head=${head}&state=all&per_page=20`,
    pullsOpen: `/pulls?head=${head}&state=open&per_page=20`,
    ref: `/git/ref/heads/${branch}`,
    snapshotAt: (sha: string) => `/contents/content/snapshot.json?ref=${sha}`,
    pull: `/pulls/${PR}`,
    compare: `/compare/${BASE_SHA}...main`,
    checks: `/commits/${HEAD_SHA}/check-runs?per_page=100`,
  };
}

function pull(kind: "open" | "merged" | "closed", snapshotId: string, overrides: { headSha?: string; baseRef?: string } = {}) {
  return fixture(`pull-${kind}`, { PR, BRANCH: `content/${snapshotId}`, PR_HEAD_SHA: overrides.headSha ?? HEAD_SHA, PR_BASE_REF: overrides.baseRef ?? "main", BASE_SHA, TEST_MERGE_SHA: "7e57".repeat(10), MERGE_SHA });
}

function snapshotFile(record: SnapshotRecordFile) {
  return fixture("contents-file", { FILE_NAME: "snapshot.json", FILE_PATH: "content/snapshot.json", FILE_TEXT: serializeSnapshotRecord(record) });
}

function compare(files: string[] = []) {
  return fixture("compare", { BASE_SHA, COMPARE_STATUS: files.length ? "ahead" : "identical", AHEAD_BY: files.length ? 1 : 0, FILES: JSON.stringify(files.map((filename) => ({ filename, status: "modified", additions: 1, deletions: 1, changes: 2 }))) });
}

function identityRun(record: SnapshotRecordFile, overrides: Partial<{ id: number; headSha: string; snapshotId: string; summary: string | null; app: string; conclusion: string }> = {}) {
  const summary = overrides.summary !== undefined ? overrides.summary : formatIdentityReport({ snapshotId: overrides.snapshotId ?? record.snapshotId, contentDigest: overrides.snapshotId ?? record.contentDigest, headSha: HEAD_SHA, packageIdentity: record.packageIdentity });
  return checkRun({ id: overrides.id ?? 900, name: IDENTITY_CHECK_NAME, headSha: overrides.headSha ?? HEAD_SHA, summary, ...(overrides.app ? { app: overrides.app } : {}), ...(overrides.conclusion ? { conclusion: overrides.conclusion } : {}) });
}

function provider(replay: Replay, policy: "manual" | "auto" = "manual") {
  return createGitHubPublicationProvider({ owner: "zudolab", repo: "pinsel", token: "test-token-not-a-secret", promotionPolicy: policy, fetch: replay.fetch, now: () => AT });
}

function refOf(snapshotId: string): ProviderRef {
  return { providerId: "github", operationId: `content/${snapshotId}`, branch: `content/${snapshotId}`, snapshotId, baselineGitSha: BASE_SHA, headSha: HEAD_SHA, pr: PR, baseBranch: "main" };
}

/** An open PR at HEAD_SHA, no base movement, and the given check runs. */
function openWith(replay: Replay, snapshotId: string, runs: unknown[], compareFiles: string[] = []) {
  const p = paths(snapshotId);
  return replay.on("GET", p.pull, { status: 200, body: pull("open", snapshotId) }).on("GET", p.compare, { status: 200, body: compare(compareFiles) }).on("GET", p.checks, { status: 200, body: checkRuns(runs) });
}

describe("GitHub provider: submit", () => {
  it("creates content/<snapshotId> from the recorded base with only the changed entry and the snapshot record, then opens a PR", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const replay = createReplay()
      .on("GET", p.pullsAll, { status: 200, body: [] })
      .on("GET", p.ref, { status: 404, body: fixture("not-found") })
      .on("GET", `/git/commits/${BASE_SHA}`, { status: 200, body: fixture("git-commit-base", { BASE_SHA, BASE_TREE: "7ee0".repeat(10) }) })
      .on("GET", `/contents/content/entries/course/two-month.json?ref=${BASE_SHA}`, { status: 200, body: fixture("contents-file", { FILE_NAME: "two-month.json", FILE_PATH: "content/entries/course/two-month.json", FILE_TEXT: diskEntry("course", "two-month") }) })
      .on("POST", "/git/trees", { status: 201, body: fixture("git-tree-created", { NEW_TREE: "7ee1".repeat(10) }) })
      .on("POST", "/git/commits", { status: 201, body: fixture("git-commit-created", { HEAD_SHA, NEW_TREE: "7ee1".repeat(10), BASE_SHA }) })
      .on("POST", "/git/refs", { status: 201, body: fixture("git-ref", { BRANCH: p.branch, HEAD_SHA }) })
      .on("GET", p.pullsOpen, { status: 200, body: [] })
      .on("POST", "/pulls", { status: 201, body: pull("open", snapshot.snapshotId) });
    const result = await provider(replay).submit({ submission: submission(snapshot), snapshot, baseline: { project: BASELINE.project, baselineRevision: BASE_SHA }, requestedBy: "editor@example.test", requestedAt: AT });

    expect(result).toEqual({ status: "ok", replayed: false, ref: refOf(snapshot.snapshotId) });
    const [tree, commit, ref, pr] = replay.writes();
    expect(tree!.body.base_tree).toBe("7ee0".repeat(10));
    const written = tree!.body.tree as { path: string; content?: string; sha?: null }[];
    expect(written.map((item) => item.path)).toEqual(["content/entries/course/two-month.json", "content/snapshot.json"]);
    expect(written.every((item) => isPublishablePath(item.path))).toBe(true);
    // The rewritten entry keeps the file's layout: the diff is the price line only.
    const before = diskEntry("course", "two-month").split("\n");
    const after = written[0]!.content!.split("\n");
    expect(after.length).toBe(before.length);
    expect(after.filter((line, index) => line !== before[index])).toEqual([`    "course-price": "¥55,000",`]);
    expect(parseSnapshotRecord(written[1]!.content!)).toEqual(recordFor(snapshot));
    expect(commit!.body).toMatchObject({ tree: "7ee1".repeat(10), parents: [BASE_SHA] });
    expect(commit!.body.message).toContain(`Pinsel-Snapshot: ${snapshot.snapshotId}`);
    expect(ref!.body).toEqual({ ref: `refs/heads/${p.branch}`, sha: HEAD_SHA });
    expect(pr!.body).toMatchObject({ head: p.branch, base: "main", maintainer_can_modify: false });
    expect(pr!.body.body).toContain(snapshot.snapshotId);
    expect(pr!.body.body).toContain(PUBLICATION_PACKAGE_IDENTITY.composerSha);
    for (const request of replay.requests) {
      expect(request.headers.get("authorization")).toBe("Bearer test-token-not-a-secret");
      expect(request.headers.get("x-github-api-version")).toBe("2022-11-28");
    }
  });

  it("reuses an existing open PR whose head carries this snapshot: no write at all", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const replay = createReplay().on("GET", p.pullsAll, { status: 200, body: [pull("open", snapshot.snapshotId)] }).on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile(recordFor(snapshot)) });
    const result = await provider(replay).submit({ submission: submission(snapshot), snapshot });
    expect(result).toEqual({ status: "ok", replayed: true, ref: refOf(snapshot.snapshotId) });
    expect(replay.writes()).toEqual([]);
  });

  it("refuses to reuse a branch that carries other content", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const other = { ...recordFor(snapshot), snapshotId: "e".repeat(64), contentDigest: "e".repeat(64) };
    const replay = createReplay()
      .on("GET", p.pullsAll, { status: 200, body: [] })
      .on("GET", p.ref, { status: 200, body: fixture("git-ref", { BRANCH: p.branch, HEAD_SHA }) })
      .on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile(other) });
    const result = await provider(replay).submit({ submission: submission(snapshot), snapshot });
    expect(result).toMatchObject({ status: "rejected", message: expect.stringContaining("other content") });
    expect(replay.writes()).toEqual([]);
  });

  it("opens a new PR on the existing branch after the previous PR was closed (retry)", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const replay = createReplay()
      .on("GET", p.pullsAll, { status: 200, body: [pull("closed", snapshot.snapshotId)] })
      .on("GET", p.ref, { status: 200, body: fixture("git-ref", { BRANCH: p.branch, HEAD_SHA }) })
      .on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile(recordFor(snapshot)) })
      .on("GET", p.pullsOpen, { status: 200, body: [] })
      .on("POST", "/pulls", { status: 201, body: pull("open", snapshot.snapshotId) });
    const result = await provider(replay).submit({ submission: submission(snapshot), snapshot });
    expect(result).toMatchObject({ status: "ok", replayed: false });
    expect(replay.writes().map((request) => `${request.method} ${request.path}`)).toEqual(["POST /pulls"]);
  });

  it("recovers a branch created by a racing attempt only when it carries the snapshot", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const replay = createReplay()
      .on("GET", p.pullsAll, { status: 200, body: [] })
      .on("GET", p.ref, { status: 404, body: fixture("not-found") }, { status: 200, body: fixture("git-ref", { BRANCH: p.branch, HEAD_SHA }) })
      .on("GET", `/git/commits/${BASE_SHA}`, { status: 200, body: fixture("git-commit-base", { BASE_SHA, BASE_TREE: "7ee0".repeat(10) }) })
      .on("POST", "/git/trees", { status: 201, body: fixture("git-tree-created", { NEW_TREE: "7ee1".repeat(10) }) })
      .on("POST", "/git/commits", { status: 201, body: fixture("git-commit-created", { HEAD_SHA: OTHER_SHA, NEW_TREE: "7ee1".repeat(10), BASE_SHA }) })
      .on("POST", "/git/refs", { status: 422, body: fixture("ref-exists-422") })
      .on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile(recordFor(snapshot)) })
      .on("GET", p.pullsOpen, { status: 200, body: [pull("open", snapshot.snapshotId)] });
    const result = await provider(replay).submit({ submission: submission(snapshot), snapshot });
    expect(result).toEqual({ status: "ok", replayed: false, ref: refOf(snapshot.snapshotId) });
  });

  it("refuses a base commit GitHub does not have, a non-Git baseline and a mismatched snapshot record", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const replay = createReplay()
      .on("GET", p.pullsAll, { status: 200, body: [] })
      .on("GET", p.ref, { status: 404, body: fixture("not-found") })
      .on("GET", `/git/commits/${BASE_SHA}`, { status: 404, body: fixture("not-found") });
    expect(await provider(replay).submit({ submission: submission(snapshot), snapshot })).toMatchObject({ status: "rejected", path: "baselineRevision" });
    const local = { ...snapshot, baselineRevision: "local-baseline" };
    expect(await provider(createReplay()).submit({ submission: { ...submission(snapshot), baselineRevision: "local-baseline" }, snapshot: local })).toMatchObject({ status: "rejected", path: "baselineRevision" });
    expect(await provider(createReplay()).submit({ submission: { ...submission(snapshot), snapshotId: "f".repeat(64), projectRevision: "f".repeat(64) }, snapshot })).toMatchObject({ status: "rejected", path: "snapshotId" });
  });

  it("reports a timeout, a lost connection and refused credentials as unknown, never as failed", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const input = { submission: submission(snapshot), snapshot };
    expect(await provider(createReplay().on("GET", p.pullsAll, { throws: "timeout" })).submit(input)).toMatchObject({ status: "timeout" });
    expect(await provider(createReplay().on("GET", p.pullsAll, { throws: "network" })).submit(input)).toMatchObject({ status: "unavailable" });
    expect(await provider(createReplay().on("GET", p.pullsAll, { status: 401, body: fixture("bad-credentials-401") })).submit(input)).toMatchObject({ status: "unavailable", message: expect.stringContaining("Bad credentials") });
    expect(await provider(createReplay().on("GET", p.pull, { status: 502, body: { message: "Bad gateway" } })).status(refOf(snapshot.snapshotId))).toMatchObject({ status: "unavailable" });
  });
});

describe("GitHub provider: lookupExisting", () => {
  it("finds the PR for the branch only when its head carries the same snapshot record", async () => {
    const snapshot = await editedSnapshot();
    const p = paths(snapshot.snapshotId);
    const found = createReplay().on("GET", p.pullsAll, { status: 200, body: [pull("open", snapshot.snapshotId)] }).on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile(recordFor(snapshot)) });
    expect(await provider(found).lookupExisting(snapshot.snapshotId)).toEqual({ status: "ok", ref: refOf(snapshot.snapshotId) });
    const tampered = createReplay().on("GET", p.pullsAll, { status: 200, body: [pull("open", snapshot.snapshotId)] }).on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile({ ...recordFor(snapshot), snapshotId: "e".repeat(64) }) });
    expect(await provider(tampered).lookupExisting(snapshot.snapshotId)).toEqual({ status: "not-found" });
    const missing = createReplay().on("GET", p.pullsAll, { status: 200, body: [pull("open", snapshot.snapshotId)] }).on("GET", p.snapshotAt(HEAD_SHA), { status: 404, body: fixture("not-found") });
    expect(await provider(missing).lookupExisting(snapshot.snapshotId)).toEqual({ status: "not-found" });
    // A merged PR still counts (its branch may have been deleted after the merge).
    const merged = createReplay().on("GET", p.pullsAll, { status: 200, body: [pull("merged", snapshot.snapshotId)] }).on("GET", p.snapshotAt(HEAD_SHA), { status: 200, body: snapshotFile(recordFor(snapshot)) });
    expect(await provider(merged).lookupExisting(snapshot.snapshotId)).toMatchObject({ status: "ok" });
    expect(await provider(createReplay().on("GET", p.pullsAll, { status: 200, body: [pull("closed", snapshot.snapshotId)] })).lookupExisting(snapshot.snapshotId)).toEqual({ status: "not-found" });
  });
});

describe("GitHub provider: status for the exact head commit", () => {
  const green = (record: SnapshotRecordFile) => [checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), identityRun(record)];

  it("verifies only with every required check green and an identity report naming this snapshot, head and package identity", async () => {
    const snapshot = await editedSnapshot();
    const record = recordFor(snapshot);
    const result = await provider(openWith(createReplay(), snapshot.snapshotId, green(record))).status(refOf(snapshot.snapshotId));
    expect(result).toMatchObject({ status: "ok", value: { state: "verified", snapshotId: snapshot.snapshotId, baselineRevision: BASE_SHA, evidence: { commit: HEAD_SHA, pr: String(PR), buildId: "900" } } });
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.value.evidence?.checks).toEqual([
      { name: "content-validate", status: "passed" },
      { name: IDENTITY_CHECK_NAME, status: "passed" },
    ]);
    expect(publicationStateFor(result.value)).toBe("validated");
  });

  it("never verifies on empty, pending, stale-head, foreign-app, unreported or mismatched evidence", async () => {
    const snapshot = await editedSnapshot();
    const record = recordFor(snapshot);
    const ref = refOf(snapshot.snapshotId);
    const stateWith = async (runs: unknown[]) => {
      const result = await provider(openWith(createReplay(), snapshot.snapshotId, runs)).status(ref);
      return result.status === "ok" ? result.value.state : result.status;
    };
    expect(await stateWith([])).toBe("submitted");
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA, status: "in_progress" }), identityRun(record)])).toBe("building");
    // Runs for another commit (an older head) say nothing about this one.
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: OTHER_SHA }), identityRun(record, { headSha: OTHER_SHA })])).toBe("submitted");
    // Only the GitHub Actions app may report identity.
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), identityRun(record, { app: "someone-elses-app" })])).toBe("building");
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA })])).toBe("building");
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), identityRun(record, { summary: "validated, trust me" })])).toBe("building");
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), identityRun(record, { snapshotId: "e".repeat(64) })])).toBe("conflict");
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA, conclusion: "failure" }), identityRun(record)])).toBe("failed");
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA, conclusion: "skipped" }), identityRun(record)])).toBe("failed");
    // A re-run that passed supersedes the failed run.
    expect(await stateWith([checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA, conclusion: "failure" }), checkRun({ id: 801, name: "content-validate", headSha: HEAD_SHA }), identityRun(record)])).toBe("verified");
    const otherPackage = createGitHubPublicationProvider({ owner: "zudolab", repo: "pinsel", token: "t", promotionPolicy: "manual", fetch: openWith(createReplay(), snapshot.snapshotId, green(record)).fetch, packageIdentity: { ...PUBLICATION_PACKAGE_IDENTITY, zfb: "9.9.9" } });
    expect(await otherPackage.status(ref)).toMatchObject({ status: "ok", value: { state: "conflict" } });
  });

  it("reports a moved PR head and content changes on main as conflict; code-only changes on main do not block", async () => {
    const snapshot = await editedSnapshot();
    const record = recordFor(snapshot);
    const ref = refOf(snapshot.snapshotId);
    const p = paths(snapshot.snapshotId);
    const pushed = createReplay().on("GET", p.pull, { status: 200, body: pull("open", snapshot.snapshotId, { headSha: OTHER_SHA }) });
    expect(await provider(pushed).status(ref)).toMatchObject({ status: "ok", value: { state: "conflict", message: expect.stringContaining(OTHER_SHA) } });
    expect(await provider(openWith(createReplay(), snapshot.snapshotId, green(record), ["content/entries/course/four-month.json"])).status(ref)).toMatchObject({ status: "ok", value: { state: "conflict" } });
    expect(await provider(openWith(createReplay(), snapshot.snapshotId, green(record), ["apps/site/pages/index.tsx"])).status(ref)).toMatchObject({ status: "ok", value: { state: "verified" } });
    const retargeted = createReplay().on("GET", p.pull, { status: 200, body: pull("open", snapshot.snapshotId, { baseRef: "release" }) });
    expect(await provider(retargeted).status(ref)).toMatchObject({ status: "ok", value: { state: "conflict" } });
  });

  it("integrates only when the merge commit carries this snapshot; a PR closed unmerged is failed", async () => {
    const snapshot = await editedSnapshot();
    const record = recordFor(snapshot);
    const ref = refOf(snapshot.snapshotId);
    const p = paths(snapshot.snapshotId);
    const merged = createReplay().on("GET", p.pull, { status: 200, body: pull("merged", snapshot.snapshotId) }).on("GET", p.snapshotAt(MERGE_SHA), { status: 200, body: snapshotFile(record) });
    expect(await provider(merged).status(ref)).toMatchObject({ status: "ok", value: { state: "integrated", evidence: { commit: MERGE_SHA, pr: String(PR) } } });
    const overwritten = createReplay().on("GET", p.pull, { status: 200, body: pull("merged", snapshot.snapshotId) }).on("GET", p.snapshotAt(MERGE_SHA), { status: 200, body: snapshotFile({ ...record, snapshotId: "e".repeat(64) }) });
    expect(await provider(overwritten).status(ref)).toMatchObject({ status: "ok", value: { state: "conflict" } });
    const closed = createReplay().on("GET", p.pull, { status: 200, body: pull("closed", snapshot.snapshotId) });
    expect(await provider(closed).status(ref)).toMatchObject({ status: "ok", value: { state: "failed", message: expect.stringContaining("closed without merging") } });
    expect(await provider(createReplay().on("GET", p.pull, { status: 404, body: fixture("not-found") })).status(ref)).toEqual({ status: "not-found" });
  });
});

describe("GitHub provider: promotion", () => {
  it("never merges under PROMOTION_POLICY=manual", async () => {
    const snapshot = await editedSnapshot();
    const replay = createReplay();
    expect(await provider(replay, "manual").promote!(refOf(snapshot.snapshotId))).toMatchObject({ status: "refused" });
    expect(replay.requests).toEqual([]);
  });

  it("merges the validated head under auto, and maps branch-rule refusals and a moved head", async () => {
    const snapshot = await editedSnapshot();
    const record = recordFor(snapshot);
    const ref = refOf(snapshot.snapshotId);
    const green = [checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA }), identityRun(record)];
    const merge = (reply: { status: number; body: unknown }) => openWith(createReplay(), snapshot.snapshotId, green).on("PUT", `/pulls/${PR}/merge`, reply);
    const ok = merge({ status: 200, body: fixture("merge-ok", { MERGE_SHA }) });
    expect(await provider(ok, "auto").promote!(ref)).toEqual({ status: "ok", commit: MERGE_SHA });
    expect(ok.writes()[0]!.body).toMatchObject({ sha: HEAD_SHA, merge_method: "merge" });
    expect(await provider(merge({ status: 405, body: fixture("merge-405") }), "auto").promote!(ref)).toMatchObject({ status: "refused", message: expect.stringContaining("Required status check") });
    expect(await provider(merge({ status: 409, body: fixture("merge-409") }), "auto").promote!(ref)).toMatchObject({ status: "conflict" });
    const pending = openWith(createReplay(), snapshot.snapshotId, [checkRun({ id: 800, name: "content-validate", headSha: HEAD_SHA, status: "queued" })]);
    expect(await provider(pending, "auto").promote!(ref)).toMatchObject({ status: "refused" });
    expect(pending.writes()).toEqual([]);
  });
});

describe("GitHub provider activation", () => {
  it("is configuration-required without its repository and token, and selectable with both", () => {
    const factories = { github: githubPublisherFactory({ fetch: createReplay().fetch }) };
    expect(selectPublisher({ PUBLISHER_PROVIDER: "github" }, factories)).toMatchObject({ ok: false, code: "configuration-required" });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "github", PUBLISHER_GITHUB_REPOSITORY: "zudolab/pinsel" }, factories)).toMatchObject({ ok: false });
    expect(selectPublisher({ PUBLISHER_PROVIDER: "github", PUBLISHER_GITHUB_TOKEN: "t", PUBLISHER_GITHUB_REPOSITORY: "not a repo" }, factories)).toMatchObject({ ok: false });
    const selected = selectPublisher({ PUBLISHER_PROVIDER: "github", PUBLISHER_GITHUB_TOKEN: "t", PUBLISHER_GITHUB_REPOSITORY: "zudolab/pinsel", PROMOTION_POLICY: "auto" }, factories);
    expect(selected).toMatchObject({ ok: true, config: { promotionPolicy: "auto" } });
    if (selected.ok) expect(selected.port.providerId).toBe("github");
    // The default stays off even with every input present.
    expect(selectPublisher({ PUBLISHER_GITHUB_TOKEN: "t", PUBLISHER_GITHUB_REPOSITORY: "zudolab/pinsel" }, factories)).toMatchObject({ ok: false });
  });
});
