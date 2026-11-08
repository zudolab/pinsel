import { hostedEditorLabelsJa, hostedErrorMessagesJa, type HostedEditorSessionState, type HostedPreviewState } from "zudo-composer/hosted-content/editor";
import type { ContentAiStatus, HostedErrorCode, HostedRevision, HostedSnapshot } from "zudo-composer/hosted-content";

const japanese = /[぀-ヿ㐀-鿿]/;
const known = (code: unknown): code is HostedErrorCode => typeof code === "string" && Object.hasOwn(hostedErrorMessagesJa, code);
/** Japanese text for any error the editor shows; untranslated server/library English never reaches the screen. */
export function errorMessageJa(error: unknown): string {
 const code = error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : undefined;
 if (known(code)) return hostedErrorMessagesJa[code];
 const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
 if (japanese.test(message)) return message;
 return "処理を完了できませんでした。変更内容は保持されています。もう一度お試しください。";
}

const phaseLabels: Record<HostedEditorSessionState["phase"], string> = {
 loading: hostedEditorLabelsJa.loading, clean: hostedEditorLabelsJa.clean, dirty: hostedEditorLabelsJa.dirty, saving: hostedEditorLabelsJa.saving, saved: hostedEditorLabelsJa.saved,
 recovering: hostedEditorLabelsJa.recovering, conflict: hostedEditorLabelsJa.conflict, blocked: hostedEditorLabelsJa.blocked, failed: hostedEditorLabelsJa.failed,
};
export function saveStatusText(state: Pick<HostedEditorSessionState, "phase" | "error">): string {
 const phase = phaseLabels[state.phase] ?? state.phase;
 if (!state.error) return `保存状態: ${phase}`;
 const detail = errorMessageJa(state.error);
 return detail === phase ? `保存状態: ${phase}` : `保存状態: ${phase} ${detail}`;
}

const previewErrors: Record<string, string> = {
 timeout: "プレビューが時間内に完了しませんでした。もう一度プレビューしてください。",
 superseded: "新しいプレビューに置き換えられました。",
 disposed: "プレビューを終了しました。",
 "identity-mismatch": "プレビューの表示部品が現在の設定と一致しません。画面を再読み込みしてください。",
 "transport-error": "プレビュー画面と通信できませんでした。もう一度プレビューしてください。",
};
export function previewStatusText(state: HostedPreviewState): string {
 switch (state.status) {
  case "idle": return "未確認";
  case "pending": return "プレビューを作成しています…";
  case "stale": return "保存内容が変わりました。もう一度プレビューしてください。";
  case "disposed": return "プレビューを終了しました。";
  case "rendered": return `確認済み（スナップショット ${state.result.snapshotId.slice(0, 8)}）`;
  case "error": {
   const fixed = previewErrors[state.error.code];
   return `プレビュー失敗: ${fixed ?? (japanese.test(state.error.message) ? state.error.message : "プレビューを表示できませんでした。もう一度お試しください。")}`;
  }
 }
}

export function snapshotDownloadLabel(snapshot: Pick<HostedSnapshot, "id" | "digest">): string {
 return `確定スナップショットを保存（ID ${snapshot.id.slice(0, 8)}…・確認値 ${snapshot.digest.slice(0, 12)}）`;
}

const operationLabels: Record<HostedRevision["operation"]["kind"], string> = {
 initial: "初期内容", "set-fields": "項目を編集", "create-entry": "項目を作成", "add-entry": "項目を追加", reorder: "並べ替え", "restore-revision": "履歴から復元", "adopt-canonical-baseline": "基準内容を採用",
};
export function formatLocalTime(iso: string, timeZone?: string): string {
 const date = new Date(iso);
 if (Number.isNaN(date.getTime())) return iso;
 return date.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", ...(timeZone ? { timeZone } : {}) });
}
export function revisionLabel(revision: Pick<HostedRevision, "sequence" | "createdAt" | "operation" | "source">, timeZone?: string): string {
 const operation = operationLabels[revision.operation.kind] ?? revision.operation.kind;
 const source = revision.source === "content-ai" ? "（AI提案による操作）" : "";
 return `#${revision.sequence} ${formatLocalTime(revision.createdAt, timeZone)} ${operation}${source}`;
}

const inferenceStates: Record<string, string> = { ready: "利用可能", unavailable: "利用できません", unknown: "状態不明" };
const inferenceCodes: Record<string, string> = {
 "host-unreachable": "ローカルAIホストに接続できません。",
 "not-authenticated": "CLIが未認証です。",
 "not-installed": "CLIがインストールされていません。",
 "unsupported-version": "CLIのバージョンが未対応です。",
};
export interface ProviderStatusText { line: string; detail: string }
/** Provider names and provider-reported details are external text: shown as reported, labelled as such. */
export function providerStatusText(value: ContentAiStatus | null | undefined): ProviderStatusText {
 if (!value?.configured) return { line: "AIホストが未設定です。pnpm dev:dogfood で起動してください。", detail: "" };
 const inference = value.inference;
 const fake = /^fake\b/i.test(value.provider) ? "（テスト用の固定応答。実際のAIではありません）" : "";
 const state = inferenceStates[inference?.state ?? "unknown"] ?? "状態不明";
 const reason = inference?.state === "unavailable" ? inferenceCodes[inference.code] ?? "" : "";
 const reported = inference ? ("detail" in inference ? inference.detail : inference.message) : "";
 return { line: `AIプロバイダー: ${value.provider}${fake} — ${state}${reason ? `。${reason}` : ""}`, detail: reported ? `プロバイダーからの詳細（原文）: ${reported}` : "" };
}

const markdownIssues: Record<string, string> = {
 "raw-html": "HTMLタグ", image: "画像", "heading-1": "# 見出し", "heading-3-plus": "### 以下の見出し", "empty-heading": "空の見出し", code: "コード記法", table: "表", blockquote: "引用", "ordered-list": "番号付きリスト", "bullet-marker": "「- 」以外の箇条書き記号", "nested-list": "入れ子のリスト", "thematic-break": "区切り線", "link-reference": "参照形式のリンク", "unsafe-link": "使えないリンク先",
};
const aiFieldLabels: Record<string, string> = { "note-title": "タイトル", "note-body": "本文" };
const aiMessages: Partial<Record<HostedErrorCode, string>> = {
 "invalid-request": "変更の指示を1〜2000文字で入力してください。",
 unavailable: "AIプロバイダーが利用できないか、結果を確認できませんでした。保存済み提案から結果を確認するか、providerを再確認してください。",
};
interface AiFieldDiagnostic { fieldId?: unknown; code?: unknown; message?: unknown }
/** Japanese text for Content-AI failures; Markdown policy diagnostics name each rule and line without echoing candidate text. */
export function aiErrorMessage(code: unknown, diagnostics: unknown): string {
 const base = known(code) ? aiMessages[code] ?? hostedErrorMessagesJa[code] : "AIの処理結果を確認できませんでした。保存済み提案から結果を確認してください。";
 const details = (Array.isArray(diagnostics) ? diagnostics as AiFieldDiagnostic[] : []).map(item => {
  const field = aiFieldLabels[String(item.fieldId)] ?? "項目";
  const issues = [...String(item.message ?? "").matchAll(/([a-z0-9-]+) \(line (\d+)\)/g)].map(([, issue, line]) => `${markdownIssues[issue!] ?? "使えない記法"}（${issue}・${line}行目）`);
  return issues.length ? `${field}: ${issues.join("、")}は使えません` : `${field}の値が使えません`;
 });
 return details.length ? `${base} ${details.join(" / ")}` : base;
}
