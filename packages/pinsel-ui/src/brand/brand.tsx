import type { Child } from "@takazudo/zfb/zudo-react";

export interface BrandProps {
  word: string;
  sub: string;
  captionLines?: readonly [string, string];
}

/** Prototype `ui.py brand()`: the wordmark linking home, in the header and the footer. */
export function Brand({ word, sub, captionLines }: BrandProps): Child {
  // No aria-label: the visible wordmark is the accessible name (WCAG 2.5.3 label in name).
  return (
    <a href="/" class={captionLines ? "brand brand--header" : "brand"}>
      <span class="brand__word">{word}</span>
      {captionLines ? <span class="brand__caption" lang="en"><span>{captionLines[0]}</span>{" "}<span>{captionLines[1]}</span></span> : <span class="brand__sub">{sub}</span>}
    </a>
  );
}
