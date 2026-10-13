import { describe, expect, it } from "vitest";

import { NOTE_SECTION_COUNTS, NOTE_SLUGS } from "../invariants";
import { checkNoteMarkdown, isAllowedLinkHref, isNoteMarkdownAllowed, noteHeadings } from "../richtext-policy";
import { readFixture } from "../import/seed-entries";

const notes = readFixture<{ notes: Record<string, { body: string; headings: { depth: number; text: string }[] }> }>("content.json").notes;

describe("note rich-text policy", () => {
  it("accepts all five approved note bodies unchanged", () => {
    for (const slug of NOTE_SLUGS) {
      expect(checkNoteMarkdown(notes[slug]!.body), slug).toEqual([]);
    }
  });

  it("derives the same h2 list as the seed, which fixes the #section-N range", () => {
    for (const slug of NOTE_SLUGS) {
      const headings = noteHeadings(notes[slug]!.body);
      expect(headings).toEqual(notes[slug]!.headings.filter((heading) => heading.depth === 2).map((heading) => heading.text));
      expect(headings).toHaveLength(NOTE_SECTION_COUNTS[slug]);
    }
  });

  it("allows h2, paragraphs, flat bullets, internal/https links, emphasis", () => {
    const body = ["## 見出し", "", "段落に *強調* と **太字** と [内部](/contact/) と [外部](https://example.com/) があります。", "", "- 一つ", "- 二つ"].join("\n");
    expect(isNoteMarkdownAllowed(body)).toBe(true);
  });

  it.each([
    ["# 見出し", "heading-1"],
    ["### 見出し", "heading-3-plus"],
    ["##", "empty-heading"],
    ["<div>x</div>", "raw-html"],
    ["<br>", "raw-html"],
    ["![alt](/img.png)", "image"],
    ["`code`", "code"],
    ["```\nx\n```", "code"],
    ["    indented", "code"],
    ["| a | b |", "table"],
    ["> quote", "blockquote"],
    ["1. first", "ordered-list"],
    ["* star", "bullet-marker"],
    ["  - nested", "nested-list"],
    ["---", "thematic-break"],
    ["[ref]: /x/", "link-reference"],
    ["[x](http://example.com/)", "unsafe-link"],
    ["[x](javascript:alert(1))", "unsafe-link"],
    ["[x](//evil.example/)", "unsafe-link"],
    ["[x](mailto:a@b.c)", "unsafe-link"],
  ])("rejects %j as %s", (body, code) => {
    expect(checkNoteMarkdown(body).map((issue) => issue.code)).toContain(code);
  });

  it("reports the line number of each issue", () => {
    const issues = checkNoteMarkdown("ok\n\n<b>x</b>\n\n1. no");
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([
      ["raw-html", 3],
      ["ordered-list", 5],
    ]);
  });
});

describe("isAllowedLinkHref", () => {
  it.each(["/", "/contact/", "/notes/x/#section-1", "/#pricing", "https://www.udk-berlin.de/"])("allows %s", (href) => {
    expect(isAllowedLinkHref(href)).toBe(true);
  });
  it.each(["", "//x", "http://x", "ftp://x", "javascript:x", "mailto:x@y", "contact/", "https://x y", "#top"])("rejects %j", (href) => {
    expect(isAllowedLinkHref(href)).toBe(false);
  });
});
