import { describe, expect, it } from "vitest";
import { HostedPreviewError } from "zudo-composer/hosted-content/editor";
import { aiErrorMessage, errorMessageJa, previewStatusText, providerStatusText, revisionLabel, saveStatusText, snapshotDownloadLabel } from "../messages-ja";
import { previewFailureMessage } from "../preview-messages";
const ascii = /^[\x00-\x7f]*$/;
describe("Japanese editor messages", () => {
 it("names the incomplete entry and field instead of a raw preview error", () => {
  const body = { error: { code: "incomplete", message: "Snapshot projection is blocked", diagnostics: [{ code: "required-value-missing", modelId: "note", model: "ノート記事", entryId: "exam-schedule", fieldId: "note-title", field: "タイトル" }] } };
  const text = previewFailureMessage(400, body);
  expect(text).toContain("ノート記事「exam-schedule」の「タイトル」が空です");
  expect(text).toContain("どのページもプレビューできません");
  expect(text).not.toMatch(/error|Preview failed|blocked/);
  expect(previewFailureMessage(400, null)).toContain("HTTP 400");
  expect(previewFailureMessage(400, { error: { code: "incomplete" } })).toContain("必須の内容が不足");
 });
 it("maps every preview status to Japanese", () => {
  for (const state of [{ status: "idle" }, { status: "stale" }, { status: "disposed" }, { status: "pending", snapshotId: "s", routeId: "/" }] as const) expect(previewStatusText(state)).not.toMatch(/idle|stale|disposed|pending/);
  expect(previewStatusText({ status: "error", error: new HostedPreviewError("render-failed", "プレビューできません。ノート記事「a」の「タイトル」が空です。") })).toBe("プレビュー失敗: プレビューできません。ノート記事「a」の「タイトル」が空です。");
  expect(previewStatusText({ status: "error", error: new HostedPreviewError("render-failed", "Visitor document could not be rendered") })).not.toContain("Visitor");
  expect(previewStatusText({ status: "error", error: new HostedPreviewError("timeout", "Preview did not finish") })).toContain("時間内に完了しませんでした");
 });
 it("shows save phases and typed errors with Composer's Japanese labels", () => {
  const conflict = Object.assign(new Error("The draft changed; review"), { code: "revision-conflict" });
  const text = saveStatusText({ phase: "conflict", error: conflict });
  expect(text).toBe("保存状態: 別のタブか別の人が先に保存しました。あなたの入力は保持されています。「現在の内容を確認」で違いを確認してください。");expect(text).not.toMatch(/conflict|The draft/);
  expect(saveStatusText({ phase: "saved", error: null })).toBe("保存状態: 保存しました");
  expect(errorMessageJa(new Error("HTTP 500"))).not.toContain("HTTP");
  expect(errorMessageJa(new Error("ログインが必要です。"))).toBe("ログインが必要です。");
 });
 it("translates Content-AI errors and keeps Markdown rules readable", () => {
  expect(aiErrorMessage("invalid-request", [])).toBe("変更の指示を1〜2000文字で入力してください。");
  const markdown = aiErrorMessage("invalid-value", [{ fieldId: "note-body", code: "invalid-value", message: "note-markdown: heading-3-plus (line 1), unsafe-link (line 3)" }]);
  expect(markdown).toContain("本文: ### 以下の見出し（heading-3-plus・1行目）、使えないリンク先（unsafe-link・3行目）は使えません");
  expect(aiErrorMessage("revision-conflict", [])).toContain("AIの操作より後に別の保存がありました");
 });
 it("labels the fake provider as test output and keeps provider text as reported", () => {
  const fake = providerStatusText({ configured: true, provider: "Fake provider (offline, deterministic)", canApply: true, inference: { state: "ready", detail: "deterministic" } });
  expect(fake.line).toContain("テスト用の固定応答");expect(fake.line).toContain("利用可能");expect(fake.detail).toBe("プロバイダーからの詳細（原文）: deterministic");
  expect(providerStatusText({ configured: true, provider: "codex-cli", canApply: true, inference: { state: "unavailable", code: "host-unreachable", message: "x" } }).line).toContain("ローカルAIホストに接続できません");
  expect(providerStatusText({ configured: false }).line).toContain("未設定");
 });
 it("formats history rows with local time, a Japanese operation and the AI source", () => {
  const row = revisionLabel({ sequence: 56, createdAt: "2026-11-08T07:20:52.145Z", operation: { kind: "set-fields", key: "k" }, source: "content-ai" }, "Asia/Tokyo");
  expect(row).toBe("#56 2026/11/08 16:20:52 項目を編集（AI提案による操作）");
  expect(revisionLabel({ sequence: 2, createdAt: "2026-11-08T07:20:52.145Z", operation: { kind: "restore-revision", key: null }, source: "pinsel-editor" }, "Asia/Tokyo")).toBe("#2 2026/11/08 16:20:52 履歴から復元");
 });
 it("describes the snapshot download in Japanese", () => {
  const text = snapshotDownloadLabel({ id: "0123456789abcdef", digest: "fedcba9876543210ffff" });
  expect(text).toBe("確定スナップショットを保存（ID 01234567…・確認値 fedcba987654）");expect(ascii.test(text)).toBe(false);
 });
});
