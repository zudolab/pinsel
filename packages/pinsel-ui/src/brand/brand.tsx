import type { Child } from "@takazudo/zfb/zudo-react";

export interface BrandProps {
  word: string;
  sub: string;
}

/** Prototype `ui.py brand()`: the wordmark linking home, in the header and the footer. */
export function Brand({ word, sub }: BrandProps): Child {
  // No aria-label: the visible wordmark is the accessible name (WCAG 2.5.3 label in name).
  return (
    <a href="/" class="brand">
      <span class="brand__word">{word}</span>
      <span class="brand__sub">{sub}</span>
    </a>
  );
}
