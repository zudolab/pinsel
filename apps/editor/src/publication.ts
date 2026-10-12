import type {
  ContentExportAdapter,
  ContentExportEvidence,
  ContentExportState,
  ContentExportStatusResult,
  ContentExportSubmission,
  ContentExportSubmitResult,
} from "zudo-composer/export";
import { API } from "./transport";
import { identityMessage } from "./site";

// Publication request + status. The Worker reports one of nine Pinsel states
// (issue #1 "Static content publication"); upstream's export vocabulary has
// seven, so the adapter keeps the Pinsel state for the host status panel and
// hands the editor the upstream equivalent only where one exists.

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

/** Deployment evidence is the only proof of `live`; not in upstream's evidence shape (asked of #11). */
export interface PublicationEvidence extends ContentExportEvidence {
  readonly deployment?: { readonly id: string; readonly url?: string };
}

export interface PublicationStatus {
  readonly operationId: string;
  readonly state: PublicationState;
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

export function hasDeploymentEvidence(status: PublicationStatus): boolean {
  const id = status.evidence?.deployment?.id;
  return typeof id === "string" && id.length > 0;
}

export function publicationDisplay(status: PublicationStatus): PublicationDisplay {
  if (status.state === "live" && !hasDeploymentEvidence(status)) return { kind: "unverified", label: "公開状況を確認できません（公開の証跡がありません）", settled: true };
  return { kind: "state", state: status.state, label: PUBLICATION_LABELS[status.state], settled: SETTLED.has(status.state) };
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
  if (typeof record.operationId !== "string" || !isPublicationState(record.state) || typeof record.snapshotId !== "string" || typeof record.baselineRevision !== "string" || typeof record.updatedAt !== "string") return null;
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

async function call(fetcher: typeof fetch, path: string, init?: { body: unknown; idempotencyKey: string }): Promise<{ httpStatus: number; body: Record<string, unknown> | null }> {
  const response = await fetcher(`${API}${path}`, {
    method: init ? "POST" : "GET",
    headers: { accept: "application/json", ...(init ? { "content-type": "application/json", "idempotency-key": init.idempotencyKey } : {}) },
    credentials: "same-origin",
    body: init ? JSON.stringify(init.body) : undefined,
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

/**
 * `ContentExportAdapter` over `/api/v1/publications`. `submit` asks for
 * confirmation first and sends nothing when declined; the idempotency key is
 * the editor's (one per snapshot), reused verbatim on every retry.
 */
export function createPublicationAdapter(options: PublicationAdapterOptions): ContentExportAdapter {
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  return {
    async submit(submission): Promise<ContentExportSubmitResult> {
      if (!(await options.confirm({ submission }))) return { status: "rejected", message: PUBLICATION_CANCELLED };
      const answer = await call(fetcher, "/publications", { body: submission, idempotencyKey: submission.idempotencyKey });
      const body = answer.body;
      const status = body?.status;
      if (status === "ok" && body?.value && typeof (body.value as Record<string, unknown>).operationId === "string") return body as unknown as ContentExportSubmitResult;
      if (status === "conflict" && typeof body?.operationId === "string") return { status: "conflict", operationId: body.operationId };
      if (status === "rejected") return { status: "rejected", message: text(body?.message, "公開申請が受け付けられませんでした。"), ...(typeof body?.path === "string" ? { path: body.path } : {}) };
      if (status === "configuration-required") return { status: "unavailable", message: `${PUBLICATION_LABELS["configuration-required"]}: ${text(body?.message, "公開の設定がまだ完了していません。")}` };
      if (status === "unauthorized") return { status: "unavailable", message: identityMessage(typeof body?.code === "string" ? body.code : undefined) };
      if (status === "unavailable") return { status: "unavailable", message: text(body?.message, "公開申請を受け付けられませんでした。") };
      // Unknown answer: the request may have arrived. Retrying with the same key is safe (idempotent per snapshot).
      return { status: "unavailable", message: `公開申請の結果を確認できませんでした（HTTP ${answer.httpStatus}）。もう一度申請すると同じ申請として扱われます。` };
    },
    async status(operationId): Promise<ContentExportStatusResult> {
      const answer = await call(fetcher, `/publications/${encodeURIComponent(operationId)}`);
      const body = answer.body;
      if (body?.status === "not-found") return { status: "not-found" };
      if (body?.status === "ok") {
        const status = readPublicationStatus(body.value);
        if (!status) return { status: "unavailable", message: "公開状況の応答を読み取れませんでした。" };
        options.onStatus(status);
        const upstream = upstreamState(status);
        if (upstream === null) return { status: "unavailable", message: `公開状況: ${publicationDisplay(status).label}${status.message ? ` — ${status.message}` : ""}` };
        return { status: "ok", value: { operationId: status.operationId, state: upstream, snapshotId: status.snapshotId, baselineRevision: status.baselineRevision, updatedAt: status.updatedAt, ...(status.evidence ? { evidence: status.evidence } : {}), ...(status.message ? { message: status.message } : {}) } };
      }
      if (body?.status === "unauthorized") return { status: "unavailable", message: identityMessage(typeof body.code === "string" ? body.code : undefined) };
      return { status: "unavailable", message: text(body?.message, `公開状況を取得できませんでした（HTTP ${answer.httpStatus}）。`) };
    },
  };
}

/** Polls one publication outside the editor; the panel shows only what the server answered. */
export async function fetchPublicationStatus(operationId: string, fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<PublicationStatus | { error: string }> {
  const answer = await call(fetcher, `/publications/${encodeURIComponent(operationId)}`);
  if (answer.body?.status === "ok") return readPublicationStatus(answer.body.value) ?? { error: "公開状況の応答を読み取れませんでした。" };
  if (answer.body?.status === "not-found") return { error: "この公開申請はサーバーに見つかりません。" };
  return { error: text(answer.body?.message, `公開状況を取得できませんでした（HTTP ${answer.httpStatus}）。`) };
}
