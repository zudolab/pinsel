// The only Markdown Pinsel renders: the subset the approved notes use and the
// content policy admits (`## ` headings, paragraphs, flat `- ` lists, inline
// links and `**strong**`). Anything else stays literal text; raw HTML never
// reaches the document because the renderer escapes every text node.

export type InlineNode = { kind: "text"; text: string } | { kind: "strong"; text: string } | { kind: "link"; href: string; text: string };

export type BlockNode =
  | { kind: "heading"; id: string; text: string }
  | { kind: "paragraph"; children: InlineNode[] }
  | { kind: "list"; items: InlineNode[][] };

/** Internal site path or https URL; mirrors `isAllowedLinkHref` in pinsel-content. */
export function isSafeHref(href: string): boolean {
  if (/[\s\\]/.test(href)) return false;
  if (/^\/(?!\/)/.test(href)) return true;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

const INLINE = /\*\*([^*]+)\*\*|(?<!!)\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) {
      nodes.push({ kind: "strong", text: match[1] });
    } else if (match[2] !== undefined && match[3] !== undefined && isSafeHref(match[3])) {
      nodes.push({ kind: "link", href: match[3], text: match[2] });
    } else {
      nodes.push({ kind: "text", text: match[0] });
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push({ kind: "text", text: text.slice(last) });
  return nodes;
}

/** Headings get `section-N` ids in source order, as the approved prototype renders them. */
export function parseMarkdown(markdown: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  let paragraph: string[] = [];
  let list: InlineNode[][] | null = null;
  let headingCount = 0;
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", children: parseInline(paragraph.join("\n")) });
      paragraph = [];
    }
    if (list) {
      blocks.push({ kind: "list", items: list });
      list = null;
    }
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flush();
      continue;
    }
    const heading = /^## (\S.*)$/.exec(line);
    if (heading) {
      flush();
      headingCount += 1;
      blocks.push({ kind: "heading", id: `section-${headingCount}`, text: heading[1]!.trim() });
      continue;
    }
    const item = /^- (.*)$/.exec(line);
    if (item) {
      if (paragraph.length > 0) flush();
      (list ??= []).push(parseInline(item[1]!));
      continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}
