import type { ContentEditorDisplayStatus, ContentEditorLabels } from "zudo-composer/content-editor";
import type { HostPreviewState } from "zudo-composer/preview-protocol";

// The host status line. Every string is derived from the editor's durable
// state (session revision, receipt, preview acknowledgement); nothing here
// claims a save or a render the editor has not proven.

export const SAVE_LABELS: Readonly<Record<ContentEditorDisplayStatus, string>> = {
  loading: "読み込み中",
  "load-failed": "読み込みに失敗",
  blocked: "編集を一時停止中",
  clean: "保存済み（改訂 {revision}）",
  unsaved: "未保存の変更",
  saving: "保存中",
  saved: "保存済み（改訂 {revision}）",
  recovering: "保存を確認中",
  conflict: "競合",
  failed: "保存に失敗",
};

export function saveStatusLabel(status: ContentEditorDisplayStatus, revision: number | null): string {
  const template = SAVE_LABELS[status];
  if (!template.includes("{revision}")) return template;
  return revision === null ? "保存済み" : template.replace("{revision}", String(revision));
}

/** Overrides for the mount's own copy, so its remaining strings match the host vocabulary. */
export const EDITOR_LABELS: Partial<ContentEditorLabels> = {
  title: "コンテンツ",
  clean: "保存済み（改訂 {revision}）",
  unsaved: "未保存の変更",
  saving: "保存中",
  saved: "保存済み（改訂 {revision}）",
  conflict: "競合",
  failed: "保存に失敗",
  preview: "保存済みの下書きをプレビュー",
  previewPending: "読み込み中",
  previewRendered: "表示中",
  previewStale: "古いプレビュー",
  previewError: "プレビューのエラー",
  submit: "公開を申請",
};

export interface PreviewExpectation {
  /** The editor's adopted durable revision. */
  readonly revision: number | null;
  readonly route: string;
  readonly status: ContentEditorDisplayStatus;
}

export type PreviewDisplay =
  | { readonly kind: "idle"; readonly label: string }
  | { readonly kind: "pending"; readonly label: string }
  | { readonly kind: "rendered"; readonly label: string; readonly revision: number }
  | { readonly kind: "stale"; readonly label: string }
  | { readonly kind: "error"; readonly label: string; readonly recoverable: boolean };

/**
 * `表示中: 改訂 n` only for an acknowledged render of exactly the open
 * revision and route with nothing unsaved; any other acknowledgement is old.
 * (The bridge already drops acks whose snapshotId/revision/route/frameLoadId
 * do not match its outstanding request.)
 */
export function previewDisplay(state: HostPreviewState, expected: PreviewExpectation): PreviewDisplay {
  if (state.status === "idle") return { kind: "idle", label: "プレビュー未表示" };
  const outdated = state.request.revision !== expected.revision || state.request.route !== expected.route || expected.status === "unsaved" || expected.status === "saving" || expected.status === "conflict";
  if (state.status === "error") return { kind: "error", label: `プレビューのエラー: ${state.message}`, recoverable: state.recoverable };
  if (outdated) return { kind: "stale", label: "古いプレビュー" };
  if (state.status === "pending") return { kind: "pending", label: "読み込み中" };
  return { kind: "rendered", label: `表示中: 改訂 ${state.request.revision}`, revision: state.request.revision };
}
