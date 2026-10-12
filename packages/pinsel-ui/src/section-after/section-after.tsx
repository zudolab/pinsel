import type { Child } from "@takazudo/zfb/zudo-react";

export interface SectionAfterProps {
  content?: readonly unknown[];
}

/** `div.section-after`: the spaced block that closes a section (links, notes, the lessons career). */
export function SectionAfter(props: SectionAfterProps): Child {
  return <div class="section-after">{(props.content ?? []) as Child}</div>;
}
