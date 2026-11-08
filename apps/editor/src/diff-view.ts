import { diffLines, foldUnchanged } from "./line-diff";

const markers = { same: { sign: " ", label: "変更なし" }, removed: { sign: "−", label: "削除" }, added: { sign: "+", label: "追加" } } as const;
/**
 * One proposed field change as a line diff. Each changed line carries a visible sign, a
 * screen-reader label and <del>/<ins> semantics, so colour is never the only signal.
 */
export function renderFieldChange(label: string, before: string, after: string): HTMLElement {
 const row = document.createElement("details"), summary = document.createElement("summary");
 row.open = true; row.className = "ai-change";
 const lines = diffLines(before, after);
 const added = lines.filter(line => line.kind === "added").length, removed = lines.filter(line => line.kind === "removed").length;
 summary.textContent = `${label}（${added || removed ? `追加 ${added} 行・削除 ${removed} 行` : "変更なし"}）`;
 const list = document.createElement("ol");
 list.className = "ai-line-diff"; list.setAttribute("aria-label", `${label}の行ごとの差分`);
 for (const item of foldUnchanged(lines)) {
  const entry = document.createElement("li");
  if (item.kind === "skipped") { entry.className = "ai-diff-skipped"; entry.textContent = `… 変更のない ${item.count} 行（全文は下の「変更前の全文」「提案の全文」）`; list.append(entry); continue; }
  entry.className = `ai-diff-${item.kind}`;
  const sign = document.createElement("span"), hidden = document.createElement("span"), text = document.createElement(item.kind === "added" ? "ins" : item.kind === "removed" ? "del" : "span");
  sign.className = "ai-diff-sign"; sign.setAttribute("aria-hidden", "true"); sign.textContent = markers[item.kind].sign;
  hidden.className = "ai-visually-hidden"; hidden.textContent = `${markers[item.kind].label}: `;
  text.textContent = item.text || " ";
  entry.append(sign, hidden, text); list.append(entry);
 }
 const full = (title: string, value: string) => { const box = document.createElement("details"), heading = document.createElement("summary"), pre = document.createElement("pre"); box.className = "ai-full-text"; heading.textContent = title; pre.textContent = value; box.append(heading, pre); return box; };
 row.append(summary, list, full("変更前の全文", before), full("提案の全文", after));
 return row;
}
