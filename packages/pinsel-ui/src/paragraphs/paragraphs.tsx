import type { Child } from "@takazudo/zfb/zudo-react";

export interface ParagraphsProps {
  /** One `<p>` per item (list fields such as the graduates passage or the about message). */
  paragraphs?: readonly string[];
  /** A single long-text value; blank lines separate paragraphs. Rendered before `paragraphs`. */
  text?: string;
}

export function paragraphTexts({ paragraphs = [], text = "" }: ParagraphsProps): string[] {
  const fromText = text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
  return [...fromText, ...paragraphs];
}

/** Prototype `ui.py paragraphs()`: plain text paragraphs in a `.prose` block. */
export function Paragraphs(props: ParagraphsProps): Child {
  return (
    <div class="prose">
      {paragraphTexts(props).map((paragraph) => (
        <p>{paragraph}</p>
      ))}
    </div>
  );
}
