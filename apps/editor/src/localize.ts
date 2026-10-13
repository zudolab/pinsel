// Stopgap Japanese copy for Composer's Content chrome. `mountContentEditor`
// localises only its own shell (`labels`); the Content route inside it
// (directory, navigator, entry form, conflict banner) renders fixed English at
// the pinned Composer. Until upstream takes labels for those (docs/dependencies.md
// "Known Composer gaps"), this observer rewrites EXACT text nodes and a few
// attributes inside the editor root. It never touches values the author
// typed: only whole text nodes / attribute values equal to a known string (or
// matching a known pattern) are replaced, and form-control values are never
// read or written.

export const CHROME_TEXT: Readonly<Record<string, string>> = {
  // Directory / navigator
  "Workspace / Content": "コンテンツ",
  "All models": "すべての項目",
  "Models describe reusable data. Entries hold the canonical values.": "編集する項目を選んでください。",
  "Model kind": "種類",
  Collections: "一覧型",
  Singles: "単一",
  collection: "一覧型",
  single: "単一",
  "Search models": "項目を検索",
  "Find a model…": "項目を検索…",
  "No models match": "一致する項目がありません",
  "Try another search or model kind.": "検索語や種類を変えてください。",
  "Clear filters": "絞り込みを解除",
  "No description yet.": "",
  "No model selected": "項目が選択されていません",
  Content: "コンテンツ",
  Complete: "入力済み",
  Incomplete: "未入力あり",
  "Incomplete draft": "未入力の項目があります",
  "Needs attention": "要確認",
  // Pane headers / tabs / actions
  Entry: "内容",
  Entries: "一覧",
  Fields: "項目",
  Editor: "編集",
  Preview: "プレビュー",
  Save: "保存",
  "Save now": "今すぐ保存",
  "No changes to save": "保存する変更はありません",
  "All changes saved": "保存済み",
  "More Content actions": "その他の操作",
  "Content actions": "その他の操作",
  "Copy entry ID": "ID をコピー",
  "Entry ID copied.": "ID をコピーしました。",
  "Entry title": "タイトル",
  "Untitled Entry": "無題",
  "Preview panel is open": "プレビューを閉じる",
  "Preview panel is closed": "プレビューを開く",
  Draft: "下書き",
  Published: "公開済み",
  "Published · pending changes": "公開済み・未公開の変更あり",
  "Published · baseline unavailable": "公開済み",
  Lifecycle: "状態",
  Completeness: "入力状況",
  All: "すべて",
  "Search Entries": "検索",
  "Search Entries…": "検索…",
  "Load more Entries": "さらに表示",
  "No Entries match": "一致するものがありません",
  "Try another search or lifecycle filter.": "検索語や絞り込みを変えてください。",
  "Entry lifecycle": "状態",
  "Add item": "行を追加",
  Remove: "削除",
  "Move up": "上へ",
  "Move down": "下へ",
  "Choose an option": "選択してください",
  "No Entry selected": "未選択",
  Metadata: "情報",
  ID: "ID",
  Created: "作成",
  Updated: "更新",
  Collapse: "たたむ",
  Open: "開く",
  "Click = select · ↵ = open": "クリックで選択・Enter で開く",
  "Short text": "短い文章",
  "Long text": "長い文章",
  Number: "数値",
  Markdown: "Markdown",
  // Save chip
  Saved: "保存済み",
  "Unsaved changes": "未保存の変更",
  "Saving…": "保存中",
  "Save failed": "保存に失敗",
  "Retry save": "保存を再試行",
  Retry: "再試行",
  // Conflict recovery
  "Use latest": "最新の内容を使う（自分の変更を破棄）",
  "Reapply my draft": "自分の変更を再適用",
  "Retry latest": "最新の内容を再読み込み",
  "Content conflict requires an explicit choice.": "他の方が先に保存しました。続け方を選んでください。",
  "Content changed in the provider. The latest records are loaded; choose whether to use them or explicitly reapply your preserved draft.":
    "他の方が先に保存しました。最新の内容を読み込みました。最新の内容を使うか、保持している自分の変更を再適用するかを選んでください。",
  "Loaded the latest provider records.": "最新の内容を読み込みました。",
  "Reapplying your draft over the latest provider records…": "最新の内容に自分の変更を再適用しています…",
  "Loading Content library…": "読み込み中…",
  "Content library unavailable": "コンテンツを読み込めません",
};

const PATTERNS: readonly [RegExp, (...groups: string[]) => string][] = [
  [/^(\d+) entries$/, (n) => `${n} 件`],
  [/^(\d+) fields$/, (n) => `${n} 項目`],
  [/^(\d+) missing$/, (n) => `未入力 ${n}`],
  [/^models$/, () => "項目"],
  [/^entries$/, () => "件"],
  [/^fields$/, () => "項目"],
  [/^published on this page$/, () => "公開済み"],
  [/^Remove item (\d+)$/, (n) => `${n} 行目を削除`],
  [/^Entries in (.+)$/, (name) => `${name} の一覧`],
  [/^Entry ID: (.+)$/, (id) => `ID: ${id}`],
];

const ATTRIBUTES = ["aria-label", "title", "placeholder"] as const;

export function translateChrome(source: string): string | null {
  const trimmed = source.trim();
  if (trimmed === "") return null;
  const exact = CHROME_TEXT[trimmed];
  let translated: string | null = exact ?? null;
  if (translated === null) {
    for (const [pattern, render] of PATTERNS) {
      const match = pattern.exec(trimmed);
      if (match) {
        translated = render(...match.slice(1));
        break;
      }
    }
  }
  if (translated === null || translated === trimmed) return null;
  return source.replace(trimmed, translated);
}

function editable(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return !!element?.closest("textarea, [contenteditable=''], [contenteditable='true'], .cm-editor, pre, code");
}

function localizeAttributes(element: Element): void {
  if (editable(element)) return;
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value === null) continue;
    const next = translateChrome(value);
    if (next !== null) element.setAttribute(name, next);
  }
}

function localizeNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (editable(node)) return;
    const next = translateChrome(node.nodeValue ?? "");
    if (next !== null) node.nodeValue = next;
    return;
  }
  if (!(node instanceof Element)) return;
  localizeAttributes(node);
  for (const child of Array.from(node.childNodes)) localizeNode(child);
}

/** Localises `root` now and on every later render; returns the disposer. */
export function localizeChrome(root: Element): () => void {
  localizeNode(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") localizeNode(record.target);
      else if (record.type === "attributes") {
        if (record.target instanceof Element) localizeAttributes(record.target);
      }
      else for (const added of Array.from(record.addedNodes)) localizeNode(added);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES] });
  return () => observer.disconnect();
}
