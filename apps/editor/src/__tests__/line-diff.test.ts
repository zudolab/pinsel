import { describe, expect, it } from "vitest";
import { diffLines, foldUnchanged, MAX_DIFF_CELLS } from "../line-diff";
import { renderFieldChange } from "../diff-view";
describe("Note AI line diff", () => {
 it("marks only changed lines", () => {
  expect(diffLines("a\nb\nc", "a\nB\nc\nd")).toEqual([{ kind: "same", text: "a" }, { kind: "removed", text: "b" }, { kind: "added", text: "B" }, { kind: "same", text: "c" }, { kind: "added", text: "d" }]);
  expect(diffLines("same", "same")).toEqual([{ kind: "same", text: "same" }]);
 });
 it("folds long unchanged runs around the changes", () => {
  const before = Array.from({ length: 10 }, (_, index) => `line ${index}`).join("\n"), after = before.replace("line 8", "LINE 8");
  const rows = foldUnchanged(diffLines(before, after));
  expect(rows[0]).toEqual({ kind: "skipped", count: 6 });
  expect(rows.filter(row => row.kind !== "skipped").map(row => "text" in row && row.text)).toEqual(["line 6", "line 7", "line 8", "LINE 8", "line 9"]);
 });
 it("renders accessible markers, not colour only, and keeps both full texts", () => {
  const element = renderFieldChange("本文", "## 見出し\n古い文", "## 見出し\n新しい文");
  expect(element.querySelector("summary")!.textContent).toBe("本文（追加 1 行・削除 1 行）");
  expect(element.querySelector("del")!.textContent).toBe("古い文");expect(element.querySelector("ins")!.textContent).toBe("新しい文");
  expect(element.querySelector(".ai-diff-removed")!.textContent).toBe("−削除: 古い文");expect(element.querySelector(".ai-diff-added")!.textContent).toBe("+追加: 新しい文");
  expect([...element.querySelectorAll(".ai-full-text pre")].map(pre => pre.textContent)).toEqual(["## 見出し\n古い文", "## 見出し\n新しい文"]);
 });
 it("reports line-ending-only changes and splits a lone CR", () => {
  expect(diffLines("a\r\nb", "a\nb")).toEqual([{ kind: "removed", text: "a" }, { kind: "added", text: "a" }, { kind: "same", text: "b" }]);
  expect(diffLines("a\rb", "a\rB")).toEqual([{ kind: "same", text: "a" }, { kind: "removed", text: "b" }, { kind: "added", text: "B" }]);
  expect(diffLines("a\nb", "a\nb\n")).toEqual([{ kind: "same", text: "a" }, { kind: "same", text: "b" }, { kind: "added", text: "" }]);
 });
 it("stays bounded for very long bodies", () => {
  const size = Math.ceil(Math.sqrt(MAX_DIFF_CELLS)) + 10;
  const before = Array.from({ length: size }, (_, index) => `old ${index}`).join("\n"), after = Array.from({ length: size }, (_, index) => `new ${index}`).join("\n");
  const lines = diffLines(`head\n${before}\ntail`, `head\n${after}\ntail`);
  expect(lines[0]).toEqual({ kind: "same", text: "head" });expect(lines.at(-1)).toEqual({ kind: "same", text: "tail" });
  expect(lines.filter(line => line.kind === "removed")).toHaveLength(size);expect(lines.filter(line => line.kind === "added")).toHaveLength(size);
 });
});
