// The records a publication leaves in Git and in CI, shared by the Worker's
// GitHub provider and the CI scripts (scripts/publication/*.mjs load this file
// through tsx). Dependency-free on purpose: CI and workerd read the same bytes.
//
// - `content/snapshot.json` (written by the provider, validated by CI):
//   the snapshot identity, its Git base and the package identity it was built for.
// - The identity report (written by the `content-validate` workflow as a check
//   run summary for the PR head commit): what CI actually validated. The
//   provider only reports `validated` when the report names the exact snapshot,
//   head commit and package identity it submitted.

export interface PublicationPackageIdentity {
  /** `@takazudo/zfb` version the site is built with. */
  readonly zfb: string;
  /** Full commit of the pinned `zudo-composer` git dependency. */
  readonly composerSha: string;
  /** Full commit of the pinned `@zudo-composer/component-contract` git dependency. */
  readonly contractSha: string;
}

export interface SnapshotRecordFile {
  readonly snapshotId: string;
  /** The Git commit the snapshot was frozen against; the content commit's only parent. */
  readonly baselineGitSha: string;
  /** sha256 of the canonical project; equals `snapshotId` for a whole-project snapshot. */
  readonly contentDigest: string;
  readonly packageIdentity: PublicationPackageIdentity;
  readonly requestedBy: string;
  readonly requestedAt: string;
}

export interface IdentityReport {
  readonly snapshotId: string;
  readonly contentDigest: string;
  /** The PR head commit CI checked out and validated. */
  readonly headSha: string;
  readonly packageIdentity: PublicationPackageIdentity;
}

/** Name of the check run the `content-validate` workflow creates after every validation step passed. */
export const IDENTITY_CHECK_NAME = "pinsel/publication-identity";
const IDENTITY_MARKER = "pinsel-publication-identity";

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function parsePackageIdentity(value: unknown): PublicationPackageIdentity | null {
  if (!isRecord(value) || Object.keys(value).length !== 3) return null;
  const { zfb, composerSha, contractSha } = value;
  if (!nonEmpty(zfb) || typeof composerSha !== "string" || !GIT_SHA.test(composerSha) || typeof contractSha !== "string" || !GIT_SHA.test(contractSha)) return null;
  return { zfb, composerSha, contractSha };
}

export function samePackageIdentity(left: PublicationPackageIdentity, right: PublicationPackageIdentity): boolean {
  return left.zfb === right.zfb && left.composerSha === right.composerSha && left.contractSha === right.contractSha;
}

/** `#<40-hex>` of a `git+https://…#<sha>` dependency spec, or null. */
function pinnedSha(spec: string | undefined): string | null {
  const sha = spec?.split("#")[1];
  return sha && GIT_SHA.test(sha) ? sha : null;
}

/** The package identity a workspace package.json declares; throws when a pin is not exact. */
export function packageIdentityFromManifest(manifest: { dependencies?: Record<string, string> }): PublicationPackageIdentity {
  const deps = manifest.dependencies ?? {};
  const zfb = deps["@takazudo/zfb"];
  const composerSha = pinnedSha(deps["zudo-composer"]);
  const contractSha = pinnedSha(deps["@zudo-composer/component-contract"]);
  if (!zfb || !/^\d+\.\d+\.\d+$/.test(zfb) || !composerSha || !contractSha) throw new Error("package.json must pin @takazudo/zfb exactly and zudo-composer / @zudo-composer/component-contract to full commits.");
  return { zfb, composerSha, contractSha };
}

/** Strict reader for `content/snapshot.json`: exact keys, digest-shaped ids, 40-hex base. */
export function parseSnapshotRecord(text: string): SnapshotRecordFile | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "baselineGitSha,contentDigest,packageIdentity,requestedAt,requestedBy,snapshotId") return null;
  const { snapshotId, baselineGitSha, contentDigest, requestedBy, requestedAt } = value;
  const packageIdentity = parsePackageIdentity(value.packageIdentity);
  if (typeof snapshotId !== "string" || !SHA256.test(snapshotId) || typeof contentDigest !== "string" || !SHA256.test(contentDigest)) return null;
  if (typeof baselineGitSha !== "string" || !GIT_SHA.test(baselineGitSha) || !nonEmpty(requestedBy) || !nonEmpty(requestedAt) || !packageIdentity) return null;
  return { snapshotId, baselineGitSha, contentDigest, packageIdentity, requestedBy, requestedAt };
}

export function serializeSnapshotRecord(record: SnapshotRecordFile): string {
  const { snapshotId, baselineGitSha, contentDigest, packageIdentity, requestedBy, requestedAt } = record;
  const { zfb, composerSha, contractSha } = packageIdentity;
  return `${JSON.stringify({ snapshotId, baselineGitSha, contentDigest, packageIdentity: { zfb, composerSha, contractSha }, requestedBy, requestedAt }, null, 2)}\n`;
}

/** Check run summary: human-readable lines plus one machine-readable marker. */
export function formatIdentityReport(report: IdentityReport): string {
  const { snapshotId, contentDigest, headSha, packageIdentity } = report;
  const marker = JSON.stringify({ snapshotId, contentDigest, headSha, packageIdentity: { zfb: packageIdentity.zfb, composerSha: packageIdentity.composerSha, contractSha: packageIdentity.contractSha } });
  return [
    `Validated snapshot \`${snapshotId}\` at head \`${headSha}\`.`,
    "",
    `- content digest: \`${contentDigest}\``,
    `- zfb ${packageIdentity.zfb}, zudo-composer \`${packageIdentity.composerSha}\`, component-contract \`${packageIdentity.contractSha}\``,
    "",
    `<!-- ${IDENTITY_MARKER} ${marker} -->`,
  ].join("\n");
}

/** The marker of a check run summary, or null when it is absent or malformed. */
export function parseIdentityReport(summary: string | null | undefined): IdentityReport | null {
  if (!summary) return null;
  const match = new RegExp(`<!-- ${IDENTITY_MARKER} (\\{.*?\\}) -->`).exec(summary);
  if (!match) return null;
  let value: unknown;
  try {
    value = JSON.parse(match[1]!);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { snapshotId, contentDigest, headSha } = value;
  const packageIdentity = parsePackageIdentity(value.packageIdentity);
  if (typeof snapshotId !== "string" || !SHA256.test(snapshotId) || typeof contentDigest !== "string" || !SHA256.test(contentDigest) || typeof headSha !== "string" || !GIT_SHA.test(headSha) || !packageIdentity) return null;
  return { snapshotId, contentDigest, headSha, packageIdentity };
}

/** Branch a snapshot is published on. */
export function contentBranchFor(snapshotId: string): string {
  return `content/${snapshotId}`;
}

export function snapshotIdOfBranch(branch: string): string | null {
  const id = branch.startsWith("content/") ? branch.slice("content/".length) : "";
  return SHA256.test(id) ? id : null;
}
