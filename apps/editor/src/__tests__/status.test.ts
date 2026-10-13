import { describe, expect, it } from "vitest";
import type { HostPreviewState } from "zudo-composer/preview-protocol";
import { previewDisplay, saveStatusLabel } from "../status";

const SNAPSHOT = "b".repeat(64);
const request = { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId: "load-1" };

describe("save status", () => {
  it("uses the client vocabulary with the durable revision", () => {
    expect(saveStatusLabel("unsaved", 3)).toBe("未保存の変更");
    expect(saveStatusLabel("saving", 3)).toBe("保存中");
    expect(saveStatusLabel("saved", 4)).toBe("保存済み（改訂 4）");
    expect(saveStatusLabel("clean", 1)).toBe("保存済み（改訂 1）");
    expect(saveStatusLabel("conflict", 3)).toBe("競合");
    expect(saveStatusLabel("failed", 3)).toBe("保存に失敗");
    expect(saveStatusLabel("saved", null)).toBe("保存済み");
  });
});

describe("preview state", () => {
  const expected = { revision: 3, route: "/", status: "saved" as const };

  it("shows 表示中 only for an acknowledged render of the open revision and route", () => {
    expect(previewDisplay({ status: "rendered", request }, expected)).toEqual({ kind: "rendered", label: "表示中: 改訂 3", revision: 3 });
    expect(previewDisplay({ status: "pending", request }, expected)).toMatchObject({ kind: "pending", label: "読み込み中" });
    expect(previewDisplay({ status: "idle" }, expected).kind).toBe("idle");
  });

  it("rejects a render of another revision, another route or with unsaved edits as stale", () => {
    const rendered: HostPreviewState = { status: "rendered", request };
    expect(previewDisplay(rendered, { ...expected, revision: 4 })).toMatchObject({ kind: "stale", label: "古いプレビュー" });
    expect(previewDisplay(rendered, { ...expected, route: "/lessons/" }).kind).toBe("stale");
    expect(previewDisplay(rendered, { ...expected, status: "unsaved" }).kind).toBe("stale");
    expect(previewDisplay(rendered, { ...expected, status: "saving" }).kind).toBe("stale");
    expect(previewDisplay(rendered, { ...expected, revision: null }).kind).toBe("stale");
    expect(previewDisplay({ status: "pending", request }, { ...expected, revision: 4 }).kind).toBe("stale");
  });

  it("shows the error with its message", () => {
    expect(previewDisplay({ status: "error", request, message: "revision mismatch", recoverable: false }, expected)).toEqual({ kind: "error", label: "プレビューのエラー: revision mismatch", recoverable: false });
  });
});
