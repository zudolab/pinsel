import { CONTENT_SNAPSHOT_PATH } from "@pinsel/content";
import { validateContentExportSubmission } from "zudo-composer/export";
import type { ContentExportEvidence } from "zudo-composer/export";
import type { ProviderLookupResult, ProviderObservation, ProviderPromoteResult, ProviderRef, ProviderStatusResult, ProviderSubmitResult, PromotionPolicy, PublicationProviderPort, PublisherFactory } from "./port";
import { IDENTITY_CHECK_NAME, contentBranchFor, parseIdentityReport, parseSnapshotRecord, samePackageIdentity, serializeSnapshotRecord, type PublicationPackageIdentity, type SnapshotRecordFile } from "./publication-record";
import { commitMessageFor, planPublication, pullRequestBodyFor, pullRequestTitleFor, publicationPackageIdentity, serializeEntryFile, type PublicationPlan } from "./snapshot-files";

// GitHub REST publisher: one snapshot = one content-only commit on
// `content/<snapshotId>` whose only parent is the recorded base commit, and one
// PR into the base branch. Written through the Git Data API (tree + commit +
// ref) so nothing outside the publish allowlist can change.
//
// What it reports is only what GitHub proves for the exact commit it created:
// - a PR head other than that commit is `conflict` (someone pushed);
// - `verified` needs every required check run green for that head AND the
//   `pinsel/publication-identity` check run (created by the content-validate
//   workflow, app `github-actions`) naming this snapshot, head and package
//   identity; empty, pending, stale or mismatched reports never verify;
// - `integrated` needs the merge commit to carry this snapshot's
//   `content/snapshot.json`;
// - content changes on the base branch since the recorded base are `conflict`.
// It never reports `deployed`: no Cloudflare build is connected.
//
// Activation: `PUBLISHER_PROVIDER=github` plus `PUBLISHER_GITHUB_REPOSITORY`
// and the `PUBLISHER_GITHUB_TOKEN` secret (docs/publication.md). Tests drive it
// with recorded responses only (test/fixtures/github/).

export const GITHUB_PROVIDER_ID = "github";
/** GitHub REST API version the adapter and its recorded fixtures follow. */
export const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_ACTIONS_APP = "github-actions";
const GIT_SHA = /^[0-9a-f]{40}$/;

export interface GitHubProviderOptions {
  owner: string;
  repo: string;
  token: string;
  promotionPolicy: PromotionPolicy;
  /** Branch content PRs target. Default `main`. */
  baseBranch?: string;
  /** Check runs that must pass for the head commit, besides the identity report. Default `["content-validate"]`. */
  requiredChecks?: readonly string[];
  packageIdentity?: PublicationPackageIdentity;
  fetch?: typeof fetch;
  /** Per request. Default 10 s. */
  timeoutMs?: number;
  apiBase?: string;
  now?: () => string;
}

class ProviderFailure extends Error {
  constructor(
    readonly kind: "timeout" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

class Refusal extends Error {
  constructor(
    message: string,
    readonly path?: string,
  ) {
    super(message);
  }
}

interface ApiResponse {
  status: number;
  body: any;
}

interface PullRequest {
  number: number;
  state: "open" | "closed";
  merged_at: string | null;
  merge_commit_sha: string | null;
  head: { ref: string; sha: string };
  base: { ref: string };
}

interface CheckRun {
  id: number;
  name: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  app?: { slug?: string } | null;
  output?: { summary?: string | null } | null;
}

type Check = NonNullable<ContentExportEvidence["checks"]>[number];

function decodeBase64Utf8(text: string): string {
  const binary = atob(text.replace(/\s+/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function guard<T>(run: () => Promise<T>): Promise<T | { status: "timeout" | "unavailable"; message: string }> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ProviderFailure) return { status: error.kind, message: error.message };
    throw error;
  }
}

export function createGitHubPublicationProvider(options: GitHubProviderOptions): PublicationProviderPort {
  const fetchImpl = options.fetch ?? fetch;
  const apiBase = (options.apiBase ?? "https://api.github.com").replace(/\/$/, "");
  const baseBranch = options.baseBranch ?? "main";
  const requiredChecks = options.requiredChecks ?? ["content-validate"];
  const identity = options.packageIdentity ?? publicationPackageIdentity();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const now = options.now ?? (() => new Date().toISOString());
  const repoPath = `/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}`;

  async function api(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    let response: Response;
    try {
      response = await fetchImpl(`${apiBase}${repoPath}${path}`, {
        method,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${options.token}`,
          "x-github-api-version": GITHUB_API_VERSION,
          "user-agent": "pinsel-authoring-worker",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") throw new ProviderFailure("timeout", `GitHub ${method} ${path} timed out after ${timeoutMs} ms.`);
      throw new ProviderFailure("unavailable", `GitHub ${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    const message = typeof parsed === "object" && parsed !== null && "message" in parsed ? String((parsed as { message: unknown }).message) : `HTTP ${response.status}`;
    // Credentials, rate limits and server errors say nothing about the submission: unknown, never failed.
    if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) throw new ProviderFailure("unavailable", `GitHub ${method} ${path}: ${response.status} ${message}`);
    return { status: response.status, body: parsed };
  }

  function unexpected(method: string, path: string, response: ApiResponse): never {
    const message = typeof response.body === "object" && response.body !== null && "message" in response.body ? String(response.body.message) : "";
    throw new ProviderFailure("unavailable", `GitHub ${method} ${path} answered ${response.status}${message ? `: ${message}` : ""}.`);
  }

  /** `content/snapshot.json` at a commit, or null when absent or not a valid record. */
  async function snapshotRecordAt(commit: string): Promise<SnapshotRecordFile | null> {
    const path = `/contents/${encodePath(CONTENT_SNAPSHOT_PATH)}?ref=${commit}`;
    const response = await api("GET", path);
    if (response.status === 404) return null;
    if (response.status !== 200) unexpected("GET", path, response);
    if (typeof response.body?.content !== "string" || response.body.encoding !== "base64") return null;
    return parseSnapshotRecord(decodeBase64Utf8(response.body.content));
  }

  async function jsonFileAt(filePath: string, commit: string): Promise<any> {
    const path = `/contents/${encodePath(filePath)}?ref=${commit}`;
    const response = await api("GET", path);
    if (response.status === 404) return undefined;
    if (response.status !== 200) unexpected("GET", path, response);
    try {
      return JSON.parse(decodeBase64Utf8(String(response.body.content)));
    } catch {
      return undefined;
    }
  }

  async function pullsFor(branch: string, state: "open" | "all"): Promise<PullRequest[]> {
    const path = `/pulls?head=${encodeURIComponent(`${options.owner}:${branch}`)}&state=${state}&per_page=20`;
    const response = await api("GET", path);
    if (response.status !== 200 || !Array.isArray(response.body)) unexpected("GET", path, response);
    return (response.body as PullRequest[]).filter((pull) => pull.head.ref === branch && pull.base.ref === baseBranch);
  }

  function refFor(snapshotId: string, baselineGitSha: string, headSha: string, pr: number): ProviderRef {
    const branch = contentBranchFor(snapshotId);
    return { providerId: GITHUB_PROVIDER_ID, operationId: branch, branch, snapshotId, baselineGitSha, headSha, pr, baseBranch };
  }

  /** An open or merged PR for the branch whose head carries this snapshot's record. */
  async function findExisting(snapshotId: string): Promise<ProviderRef | null> {
    const branch = contentBranchFor(snapshotId);
    const pulls = await pullsFor(branch, "all");
    const candidates = [...pulls.filter((pull) => pull.state === "open"), ...pulls.filter((pull) => pull.merged_at !== null)];
    for (const pull of candidates) {
      const record = await snapshotRecordAt(pull.head.sha);
      if (record?.snapshotId === snapshotId) return refFor(snapshotId, record.baselineGitSha, pull.head.sha, pull.number);
    }
    return null;
  }

  async function createCommit(plan: PublicationPlan, project: Parameters<typeof serializeEntryFile>[1]): Promise<string> {
    const base = plan.record.baselineGitSha;
    const commitPath = `/git/commits/${base}`;
    const baseCommit = await api("GET", commitPath);
    if (baseCommit.status === 404 || baseCommit.status === 422) throw new Refusal(`The base commit ${base} does not exist in ${options.owner}/${options.repo}.`, "baselineRevision");
    if (baseCommit.status !== 200) unexpected("GET", commitPath, baseCommit);
    const tree: { path: string; mode: "100644"; type: "blob"; content?: string; sha?: null }[] = [];
    for (const write of plan.writes) {
      const previous = write.existed ? await jsonFileAt(write.path, base) : undefined;
      tree.push({ path: write.path, mode: "100644", type: "blob", content: serializeEntryFile(write.entry, project, previous) });
    }
    for (const path of plan.deletes) tree.push({ path, mode: "100644", type: "blob", sha: null });
    tree.push({ path: CONTENT_SNAPSHOT_PATH, mode: "100644", type: "blob", content: serializeSnapshotRecord(plan.record) });
    const createdTree = await api("POST", "/git/trees", { base_tree: baseCommit.body.tree.sha, tree });
    if (createdTree.status !== 201) unexpected("POST", "/git/trees", createdTree);
    const commit = await api("POST", "/git/commits", { message: commitMessageFor(plan), tree: createdTree.body.sha, parents: [base] });
    if (commit.status !== 201) unexpected("POST", "/git/commits", commit);
    return String(commit.body.sha);
  }

  /** The branch head, created at `commit` unless it exists. A branch that exists must carry this snapshot. */
  async function ensureBranch(plan: PublicationPlan, makeCommit: () => Promise<string>): Promise<string> {
    const refPath = `/git/ref/heads/${plan.branch}`;
    const read = async (): Promise<string | null> => {
      const response = await api("GET", refPath);
      if (response.status === 404) return null;
      if (response.status !== 200) unexpected("GET", refPath, response);
      return String(response.body.object.sha);
    };
    const verify = async (sha: string): Promise<string> => {
      const record = await snapshotRecordAt(sha);
      if (record?.snapshotId !== plan.record.snapshotId || record.baselineGitSha !== plan.record.baselineGitSha) throw new Refusal(`Branch ${plan.branch} already exists with other content; it is not reused.`);
      return sha;
    };
    const existing = await read();
    if (existing) return verify(existing);
    const sha = await makeCommit();
    const created = await api("POST", "/git/refs", { ref: `refs/heads/${plan.branch}`, sha });
    if (created.status === 201) return sha;
    if (created.status !== 422) unexpected("POST", "/git/refs", created);
    // Created concurrently (or by an earlier attempt whose answer was lost): reuse it only if it carries the snapshot.
    const raced = await read();
    if (!raced) unexpected("POST", "/git/refs", created);
    return verify(raced);
  }

  async function observe(ref: ProviderRef): Promise<ProviderStatusResult> {
    const snapshotId = String(ref.snapshotId);
    const headSha = String(ref.headSha);
    const at = { snapshotId, baselineRevision: String(ref.baselineGitSha), observedAt: now() };
    const pullPath = `/pulls/${Number(ref.pr)}`;
    const pullResponse = await api("GET", pullPath);
    if (pullResponse.status === 404) return { status: "not-found" };
    if (pullResponse.status !== 200) unexpected("GET", pullPath, pullResponse);
    const pull = pullResponse.body as PullRequest;
    const pr = String(pull.number);
    const ok = (value: Omit<ProviderObservation, keyof typeof at>): ProviderStatusResult => ({ status: "ok", value: { ...at, ...value } });

    if (pull.head.sha !== headSha) return ok({ state: "conflict", evidence: { pr }, message: `The content branch head moved to ${pull.head.sha}; the publication wrote ${headSha}.` });
    if (pull.merged_at) {
      const mergeSha = pull.merge_commit_sha;
      if (!mergeSha || !GIT_SHA.test(mergeSha)) return ok({ state: "building", evidence: { pr }, message: "GitHub reports the PR merged but no merge commit yet." });
      const record = await snapshotRecordAt(mergeSha);
      if (record?.snapshotId !== snapshotId) return ok({ state: "conflict", evidence: { pr }, message: `Merge commit ${mergeSha} does not carry snapshot ${snapshotId} in ${CONTENT_SNAPSHOT_PATH}.` });
      return ok({ state: "integrated", evidence: { commit: mergeSha, pr }, message: `Merged as ${mergeSha}.` });
    }
    if (pull.state === "closed") return ok({ state: "failed", evidence: { pr }, message: `PR #${pr} was closed without merging.` });
    if (pull.base.ref !== baseBranch) return ok({ state: "conflict", evidence: { pr }, message: `PR #${pr} now targets ${pull.base.ref}, not ${baseBranch}.` });

    const comparePath = `/compare/${at.baselineRevision}...${encodeURIComponent(baseBranch)}`;
    const compare = await api("GET", comparePath);
    if (compare.status !== 200) unexpected("GET", comparePath, compare);
    const moved = ((compare.body.files ?? []) as { filename: string }[]).filter((file) => file.filename.startsWith("content/"));
    if (moved.length > 0) return ok({ state: "conflict", evidence: { pr }, message: `${baseBranch} changed ${moved.map((file) => file.filename).slice(0, 5).join(", ")} since ${at.baselineRevision}; snapshot again on the new baseline.` });

    const checksPath = `/commits/${headSha}/check-runs?per_page=100`;
    const checkResponse = await api("GET", checksPath);
    if (checkResponse.status !== 200) unexpected("GET", checksPath, checkResponse);
    // Only runs for the exact head; the latest run per name wins (re-runs).
    const runs = ((checkResponse.body.check_runs ?? []) as CheckRun[]).filter((run) => run.head_sha === headSha);
    const latest = (name: string, from = runs) => from.filter((run) => run.name === name).sort((left, right) => right.id - left.id)[0];
    const checkOf = (name: string, run: CheckRun | undefined): Check => ({ name, status: !run || run.status !== "completed" ? "pending" : run.conclusion === "success" ? "passed" : "failed" });
    const identityRun = latest(IDENTITY_CHECK_NAME, runs.filter((run) => run.app?.slug === GITHUB_ACTIONS_APP));
    const checks: Check[] = [...requiredChecks.map((name) => checkOf(name, latest(name))), checkOf(IDENTITY_CHECK_NAME, identityRun)];
    const failed = checks.filter((check) => check.status === "failed");
    if (failed.length > 0) return ok({ state: "failed", evidence: { commit: headSha, pr, checks }, message: `Checks failed for ${headSha}: ${failed.map((check) => check.name).join(", ")}.` });
    if (runs.length === 0) return ok({ state: "submitted", evidence: { commit: headSha, pr, checks }, message: `PR #${pr} is open; no checks have started for ${headSha}.` });
    if (checks.some((check) => check.status === "pending")) return ok({ state: "building", evidence: { commit: headSha, pr, checks } });
    const report = parseIdentityReport(identityRun?.output?.summary);
    if (!report) return ok({ state: "building", evidence: { commit: headSha, pr, checks }, message: `${IDENTITY_CHECK_NAME} passed without an identity report.` });
    if (report.snapshotId !== snapshotId || report.contentDigest !== snapshotId || report.headSha !== headSha || !samePackageIdentity(report.packageIdentity, identity)) {
      return ok({ state: "conflict", evidence: { commit: headSha, pr, checks }, message: `CI validated snapshot ${report.snapshotId} at ${report.headSha} (zfb ${report.packageIdentity.zfb}); this publication is ${snapshotId} at ${headSha} (zfb ${identity.zfb}).` });
    }
    return ok({ state: "verified", evidence: { commit: headSha, pr, buildId: String(identityRun!.id), checks } });
  }

  return {
    providerId: GITHUB_PROVIDER_ID,

    async submit(input): Promise<ProviderSubmitResult> {
      const validation = validateContentExportSubmission(input.submission);
      if (!validation.ok) return { status: "rejected", message: validation.message, ...(validation.path ? { path: validation.path } : {}) };
      const submission = validation.value;
      const snapshot = input.snapshot;
      if (snapshot.snapshotId !== submission.snapshotId || snapshot.baselineRevision !== submission.baselineRevision) return { status: "rejected", message: "The snapshot record does not match the submission.", path: "snapshotId" };
      if (!GIT_SHA.test(submission.baselineRevision)) return { status: "rejected", message: `Baseline revision "${submission.baselineRevision}" is not a Git commit.`, path: "baselineRevision" };
      const plan = planPublication({
        snapshot,
        ...(input.baseline?.baselineRevision === submission.baselineRevision ? { baselineProject: input.baseline.project } : {}),
        packageIdentity: identity,
        requestedBy: input.requestedBy ?? "unknown",
        requestedAt: input.requestedAt ?? now(),
      });
      try {
        return await guard(async (): Promise<ProviderSubmitResult> => {
          const existing = await findExisting(submission.snapshotId);
          if (existing) return { status: "ok", ref: existing, replayed: true };
          const headSha = await ensureBranch(plan, () => createCommit(plan, snapshot.project));
          let [pull] = await pullsFor(plan.branch, "open");
          if (!pull) {
            const created = await api("POST", "/pulls", { title: pullRequestTitleFor(plan), head: plan.branch, base: baseBranch, body: pullRequestBodyFor(plan, options.promotionPolicy), maintainer_can_modify: false });
            if (created.status === 201) pull = created.body as PullRequest;
            else if (created.status === 422) [pull] = await pullsFor(plan.branch, "open");
            if (!pull) throw new Refusal(`GitHub refused to open a PR for ${plan.branch}: ${String(created.body?.message ?? created.status)}.`);
          }
          if (pull.head.sha !== headSha) return { status: "conflict", message: `PR #${pull.number} head is ${pull.head.sha}, not the publication commit ${headSha}.` };
          return { status: "ok", ref: refFor(submission.snapshotId, submission.baselineRevision, headSha, pull.number), replayed: false };
        });
      } catch (error) {
        if (error instanceof Refusal) return { status: "rejected", message: error.message, ...(error.path ? { path: error.path } : {}) };
        throw error;
      }
    },

    async status(ref) {
      if (ref.providerId !== GITHUB_PROVIDER_ID || typeof ref.pr !== "number" || typeof ref.headSha !== "string" || typeof ref.snapshotId !== "string") return { status: "not-found" };
      return guard(() => observe(ref));
    },

    async lookupExisting(snapshotId): Promise<ProviderLookupResult> {
      return guard(async (): Promise<ProviderLookupResult> => {
        const existing = await findExisting(snapshotId);
        return existing ? { status: "ok", ref: existing } : { status: "not-found" };
      });
    },

    async promote(ref): Promise<ProviderPromoteResult> {
      if (options.promotionPolicy !== "auto") return { status: "refused", message: "PROMOTION_POLICY is manual; a maintainer merges the PR." };
      return guard(async (): Promise<ProviderPromoteResult> => {
        // Re-read right before merging: promotion is never based on an older observation.
        const observed = await observe(ref);
        if (observed.status !== "ok") return { status: "refused", message: "The PR is gone." };
        if (observed.value.state === "integrated" && observed.value.evidence?.commit) return { status: "ok", commit: observed.value.evidence.commit };
        if (observed.value.state === "conflict") return { status: "conflict", message: observed.value.message ?? "conflict" };
        if (observed.value.state !== "verified") return { status: "refused", message: `Not every required check passed (${observed.value.state}).` };
        const mergePath = `/pulls/${Number(ref.pr)}/merge`;
        const merged = await api("PUT", mergePath, { sha: String(ref.headSha), merge_method: "merge", commit_title: `Merge content snapshot ${String(ref.snapshotId).slice(0, 12)} (#${Number(ref.pr)})` });
        if (merged.status === 200 && merged.body?.merged === true && GIT_SHA.test(String(merged.body.sha))) return { status: "ok", commit: String(merged.body.sha) };
        const message = String(merged.body?.message ?? `HTTP ${merged.status}`);
        // 409: the head moved since validation; 405/422: branch rules or mergeability refused it.
        if (merged.status === 409) return { status: "conflict", message };
        if (merged.status === 405 || merged.status === 422 || merged.status === 404) return { status: "refused", message };
        unexpected("PUT", mergePath, merged);
      });
    },
  };
}

function stringVar(env: Record<string, unknown>, name: string): string {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * `PUBLISHER_PROVIDER=github`. Needs `PUBLISHER_GITHUB_REPOSITORY` (`owner/repo`)
 * and the `PUBLISHER_GITHUB_TOKEN` secret; optional `PUBLISHER_GITHUB_BASE_BRANCH`
 * and `PUBLISHER_GITHUB_REQUIRED_CHECKS` (comma-separated). Missing inputs → null
 * → `configuration-required`.
 */
export function githubPublisherFactory(overrides: Partial<Pick<GitHubProviderOptions, "fetch" | "now" | "timeoutMs" | "packageIdentity">> = {}): PublisherFactory {
  return (env, config) => {
    const token = stringVar(env, "PUBLISHER_GITHUB_TOKEN");
    const repository = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(stringVar(env, "PUBLISHER_GITHUB_REPOSITORY"));
    if (!token || !repository) return null;
    const baseBranch = stringVar(env, "PUBLISHER_GITHUB_BASE_BRANCH") || "main";
    const required = stringVar(env, "PUBLISHER_GITHUB_REQUIRED_CHECKS");
    let packageIdentity: PublicationPackageIdentity;
    try {
      packageIdentity = overrides.packageIdentity ?? publicationPackageIdentity();
    } catch {
      // Unpinned dependencies: no publication can name what it was built for.
      return null;
    }
    return createGitHubPublicationProvider({
      owner: repository[1]!,
      repo: repository[2]!,
      token,
      baseBranch,
      promotionPolicy: config.promotionPolicy,
      packageIdentity,
      ...(required ? { requiredChecks: required.split(",").map((name) => name.trim()).filter(Boolean) } : {}),
      ...overrides,
    });
  };
}
