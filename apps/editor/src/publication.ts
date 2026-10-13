import type { ContentExportAdapter, ContentExportEvidence, ContentExportState, ContentExportStatusResult, ContentExportSubmission, ContentExportSubmitResult } from "zudo-composer/export";
import { API } from "./transport";
import { identityMessage } from "./site";

// Publication request + status over the Worker's /api/v1/publications
// (docs/authoring-worker.md "Publications"). The Worker reports one of nine
// Pinsel states (issue #1 "Static content publication"); upstream's export
// vocabulary has seven, so the adapter keeps the Pinsel job for the host
// status panel and hands the editor the upstream equivalent only where one
// exists. The Worker derives projectRevision, package identity and the
// idempotency key itself (one job per snapshot), so the client sends only
// `{ snapshotId, expectedBaselineRevision }`.

export const PUBLICATION_STATES = ["draft-saved", "submitted", "building", "validated", "integrated", "live", "failed", "conflict", "configuration-required"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const PUBLICATION_LABELS: Readonly<Record<PublicationState, string>> = {
  "draft-saved": "下書き保存済み",
  submitted: "公開申請済み",
  building: "ビルド中",
  validated: "検証済み",
  integrated: "反映済み",
  live: "公開中",
  failed: "失敗",
  conflict: "公開内容の競合",
  "configuration-required": "設定が必要",
};

export interface PublicationEvidence extends ContentExportEvidence {
  /** Only deployment evidence for the integration commit proves `live`. */
  readonly deployment?: { readonly deploymentId: string; readonly commit: string; readonly observedAt?: string };
}

/** The Worker's `PublicationView` (the fields the editor reads). */
export interface PublicationStatus {
  readonly publicationId: string;
  readonly state: PublicationState;
  /** Set with `configuration-required`: the state stored before publication was disabled. */
  readonly lastObservedState?: PublicationState;
  readonly snapshotId: string;
  readonly baselineRevision: string;
  readonly evidence?: PublicationEvidence;
  readonly message?: string;
  readonly updatedAt: string;
}

export type PublicationDisplay =
  | { readonly kind: "state"; readonly state: PublicationState; readonly label: string; readonly settled: boolean }
  /** The server claimed `live` without deployment evidence: never shown as 公開中. */
  | { readonly kind: "unverified"; readonly label: string; readonly settled: true };

const SETTLED: ReadonlySet<PublicationState> = new Set(["integrated", "live", "failed", "conflict", "configuration-required", "draft-saved"]);

export function isPublicationState(value: unknown): value is PublicationState {
  return typeof value === "string" && (PUBLICATION_STATES as readonly string[]).includes(value);
}

/** The Worker already downgrades unproven `live`; the editor checks again rather than trust the word. */
export function hasDeploymentEvidence(status: PublicationStatus): boolean {
  const deployment = status.evidence?.deployment;
  return typeof deployment?.deploymentId === "string" && deployment.deploymentId.length > 0 && typeof deployment.commit === "string" && deployment.commit.length > 0 && deployment.commit === status.evidence?.commit;
}

export function publicationDisplay(status: PublicationStatus): PublicationDisplay {
  if (status.state === "live" && !hasDeploymentEvidence(status)) return { kind: "unverified", label: "公開状況を確認できません（公開の証跡がありません）", settled: true };
  const label = status.state === "configuration-required" && status.lastObservedState && status.lastObservedState !== "configuration-required" ? `${PUBLICATION_LABELS["configuration-required"]}（最後の状況: ${PUBLICATION_LABELS[status.lastObservedState]}）` : PUBLICATION_LABELS[status.state];
  return { kind: "state", state: status.state, label, settled: SETTLED.has(status.state) };
}

const TO_UPSTREAM: Partial<Record<PublicationState, ContentExportState>> = {
  submitted: "submitted",
  building: "building",
  validated: "verified",
  integrated: "integrated",
  live: "deployed",
  failed: "failed",
  conflict: "conflict",
};

/** The upstream state for the editor's own record; `null` where upstream has no equivalent or `live` is unproven. */
export function upstreamState(status: PublicationStatus): ContentExportState | null {
  if (status.state === "live" && !hasDeploymentEvidence(status)) return null;
  return TO_UPSTREAM[status.state] ?? null;
}

export function readPublicationStatus(value: unknown): PublicationStatus | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.publicationId !== "string" || !isPublicationState(record.state) || typeof record.snapshotId !== "string" || typeof record.baselineRevision !== "string" || typeof record.updatedAt !== "string") return null;
  if (record.lastObservedState !== undefined && record.lastObservedState !== null && !isPublicationState(record.lastObservedState)) return null;
  return record as unknown as PublicationStatus;
}

/** What the confirmation dialog shows before anything is sent. */
export interface PublicationRequestSummary {
  readonly submission: ContentExportSubmission;
}

export interface PublicationAdapterOptions {
  /** Resolves `true` only when the user confirmed this exact submission. */
  confirm(summary: PublicationRequestSummary): Promise<boolean>;
  onStatus(status: PublicationStatus): void;
  fetcher?: typeof fetch;
}

export const PUBLICATION_CANCELLED = "公開申請を取り消しました（何も送信していません）。";

type Body = Record<string, unknown> | null;

async function call(fetcher: typeof fetch, path: string, body?: unknown): Promise<{ httpStatus: number; body: Body }> {
  const response = await fetcher(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    const parsed: unknown = await response.json();
    return { httpStatus: response.status, body: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null };
  } catch {
    return { httpStatus: response.status, body: null };
  }
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function isConfigurationRequired(body: Body): boolean {
  return body?.code === "configuration-required" || body?.state === "configuration-required";
}

const CONFLICT_MESSAGES: Record<string, string> = {
  "baseline-revision": "公開版がこの下書きの作成後に更新されました。画面を開き直して最新の内容から申請してください。",
  "package-identity": "サイトの部品セットが更新されたため、この下書きは申請できません。開発者に連絡してください。",
  "operation-id": "このスナップショットは別の内容で申請済みです。",
};

/** Error answers shared by submit and status: identity, configuration, unavailable. */
function failureMessage(answer: { httpStatus: number; body: Body }, fallback: string): string {
  const body = answer.body;
  if (body?.status === "unauthorized") return identityMessage(typeof body.code === "string" ? body.code : undefined);
  if (isConfigurationRequired(body)) return `${PUBLICATION_LABELS["configuration-required"]}: ${text(body?.message, "公開の設定がまだ完了していません。")}`;
  return text(body?.message, `${fallback}（HTTP ${answer.httpStatus}）`);
}

/**
 * `ContentExportAdapter` over `/api/v1/publications`. `submit` asks for
 * confirmation first and sends nothing when declined; a repeat for the same
 * snapshot returns the same job (`replayed`), so retrying is safe.
 */
export function createPublicationAdapter(options: PublicationAdapterOptions): ContentExportAdapter {
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  const adopt = (value: unknown): PublicationStatus | null => {
    const job = readPublicationStatus(value);
    if (job) options.onStatus(job);
    return job;
  };
  return {
    async submit(submission): Promise<ContentExportSubmitResult> {
      if (!(await options.confirm({ submission }))) return { status: "rejected", message: PUBLICATION_CANCELLED };
      const answer = await call(fetcher, "/publications", { snapshotId: submission.snapshotId, expectedBaselineRevision: submission.baselineRevision });
      const body = answer.body;
      switch (body?.status) {
        case "ok": {
          const job = adopt(body.value);
          if (job) return { status: "ok", value: { operationId: job.publicationId, replayed: body.replayed === true } };
          break;
        }
        // The job is durable; reading it resolves what the provider did.
        case "uncertain": {
          const job = adopt(body.value);
          if (job) return { status: "ok", value: { operationId: job.publicationId, replayed: false } };
          return { status: "unavailable", message: "公開申請の結果を確認できませんでした。もう一度申請すると同じ申請として扱われます。" };
        }
        case "conflict":
          adopt(body.value);
          return { status: "rejected", message: `${PUBLICATION_LABELS.conflict}: ${CONFLICT_MESSAGES[String(body.reason)] ?? text(body.message, "申請できませんでした。")}` };
        case "rejected":
          adopt(body.value);
          return { status: "rejected", message: text(body.message, "公開申請が受け付けられませんでした。"), ...(typeof body.path === "string" ? { path: body.path } : {}) };
        case "not-found":
          return { status: "rejected", message: "このスナップショットはサーバーに見つかりません。プレビューし直してから申請してください。" };
        case "unavailable":
        case "unauthorized":
        case "forbidden":
          return { status: "unavailable", message: failureMessage(answer, "公開申請を受け付けられませんでした") };
      }
      // Unknown answer: the request may have arrived. Retrying is safe (one job per snapshot).
      return { status: "unavailable", message: `公開申請の結果を確認できませんでした（HTTP ${answer.httpStatus}）。もう一度申請すると同じ申請として扱われます。` };
    },
    async status(publicationId): Promise<ContentExportStatusResult> {
      const answer = await call(fetcher, `/publications/${encodeURIComponent(publicationId)}`);
      const body = answer.body;
      if (body?.status === "not-found" || answer.httpStatus === 404) return { status: "not-found" };
      if (body?.status === "ok") {
        const job = adopt(body.value);
        if (!job) return { status: "unavailable", message: "公開状況の応答を読み取れませんでした。" };
        const upstream = upstreamState(job);
        if (upstream === null) return { status: "unavailable", message: `公開状況: ${publicationDisplay(job).label}${job.message ? ` — ${job.message}` : ""}` };
        return { status: "ok", value: { operationId: job.publicationId, state: upstream, snapshotId: job.snapshotId, baselineRevision: job.baselineRevision, updatedAt: job.updatedAt, ...(job.evidence ? { evidence: job.evidence } : {}), ...(job.message ? { message: job.message } : {}) } };
      }
      return { status: "unavailable", message: failureMessage(answer, "公開状況を取得できませんでした") };
    },
  };
}

/** Reads one publication outside the editor; the panel shows only what the server answered. */
export async function fetchPublicationStatus(publicationId: string, fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<PublicationStatus | { error: string }> {
  const answer = await call(fetcher, `/publications/${encodeURIComponent(publicationId)}`);
  if (answer.body?.status === "ok") return readPublicationStatus(answer.body.value) ?? { error: "公開状況の応答を読み取れませんでした。" };
  if (answer.body?.status === "not-found" || answer.httpStatus === 404) return { error: "この公開申請はサーバーに見つかりません。" };
  return { error: failureMessage(answer, "公開状況を取得できませんでした") };
}
