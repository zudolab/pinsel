// The five approved notes (`tests/fixtures/approved-seed/content.json` →
// `notes.*.body`) use only `## ` headings, paragraphs, flat `- ` lists and one
// inline link each. The prototype renderer (`build.py note_body()`) understands
// exactly those blocks plus `**strong**`; anything else would either render as
// literal text or require a renderer the approved design never had.

export const NOTE_ALLOWED_BLOCKS = ["heading-2", "paragraph", "bullet-list"] as const;
export const NOTE_ALLOWED_INLINES = ["link", "emphasis", "strong"] as const;

export type NoteMarkdownIssueCode =
  | "raw-html"
  | "image"
  | "heading-1"
  | "heading-3-plus"
  | "empty-heading"
  | "code"
  | "table"
  | "blockquote"
  | "ordered-list"
  | "bullet-marker"
  | "nested-list"
  | "thematic-break"
  | "link-reference"
  | "unsafe-link";

export const NOTE_FORBIDDEN_CODES: readonly NoteMarkdownIssueCode[] = [
  "raw-html",
  "image",
  "heading-1",
  "heading-3-plus",
  "empty-heading",
  "code",
  "table",
  "blockquote",
  "ordered-list",
  "bullet-marker",
  "nested-list",
  "thematic-break",
  "link-reference",
  "unsafe-link",
];

export interface NoteMarkdownIssue {
  code: NoteMarkdownIssueCode;
  /** 1-based line in the markdown source. */
  line: number;
  message: string;
}

/** Site-relative path (`/notes/x/`, `/contact/#faq`) — never protocol-relative. */
export function isInternalHref(href: string): boolean {
  return /^\/(?!\/)[^\s]*$/.test(href);
}

export function isHttpsHref(href: string): boolean {
  if (/[\s\\]/.test(href)) return false;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

/** Link destinations the client editor may enter anywhere: internal paths or https URLs. */
export function isAllowedLinkHref(href: string): boolean {
  return isInternalHref(href) || isHttpsHref(href);
}

const INLINE_LINK = /(?<!!)\[([^\]]*)\]\(([^)]*)\)/g;

const LINE_RULES: readonly { code: NoteMarkdownIssueCode; test: RegExp; message: string }[] = [
  { code: "heading-1", test: /^#\s/, message: "h1 は記事タイトルが使うため本文では使えません" },
  { code: "heading-3-plus", test: /^#{3,}\s/, message: "見出しは ## のみ使えます" },
  { code: "empty-heading", test: /^#{1,6}\s*$/, message: "空の見出しは使えません" },
  { code: "ordered-list", test: /^\s*\d+[.)]\s/, message: "番号付きリストは使えません" },
  { code: "bullet-marker", test: /^\s*[*+]\s/, message: "箇条書きは「- 」で始めてください" },
  { code: "nested-list", test: /^\s+-\s/, message: "入れ子のリストは使えません" },
  { code: "blockquote", test: /^\s*>/, message: "引用ブロックは使えません" },
  { code: "thematic-break", test: /^\s*([-*_])(\s*\1){2,}\s*$/, message: "区切り線は使えません" },
  { code: "table", test: /^\s*\|/, message: "表は使えません" },
  { code: "code", test: /^(\t| {4})\S/, message: "コードブロックは使えません" },
  { code: "code", test: /`/, message: "コード記法（バッククォート）は使えません" },
  { code: "link-reference", test: /^\s*\[[^\]]+\]:\s/, message: "参照形式のリンクは使えません" },
  { code: "image", test: /!\[/, message: "画像は使えません" },
  { code: "raw-html", test: /<[a-zA-Z/!?]/, message: "HTML タグは使えません" },
];

/** Returns every policy violation in a note body; an empty array means the body is publishable. */
export function checkNoteMarkdown(markdown: string): NoteMarkdownIssue[] {
  const issues: NoteMarkdownIssue[] = [];
  const lines = markdown.split(/\r?\n/);
  lines.forEach((text, index) => {
    const line = index + 1;
    for (const rule of LINE_RULES) {
      if (rule.test.test(text)) issues.push({ code: rule.code, line, message: rule.message });
    }
    for (const match of text.matchAll(INLINE_LINK)) {
      const href = (match[2] ?? "").trim();
      if (!isAllowedLinkHref(href)) {
        issues.push({ code: "unsafe-link", line, message: `リンク先 "${href}" は / で始まる内部パスか https:// のみ使えます` });
      }
    }
  });
  return issues;
}

export function isNoteMarkdownAllowed(markdown: string): boolean {
  return checkNoteMarkdown(markdown).length === 0;
}

/** `## ` headings in source order; the renderer assigns `#section-N` from this list. */
export function noteHeadings(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^## \S/.test(line))
    .map((line) => line.slice(3).trim());
}
