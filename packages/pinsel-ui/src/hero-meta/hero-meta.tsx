import type { Child } from "@takazudo/zfb/zudo-react";

export interface HeroMetaProps {
  line: string;
  intro: string;
}

/** The two-line band under the home hero. */
export function HeroMeta({ line, intro }: HeroMetaProps): Child {
  return (
    <div class="container hero-meta reading-zone">
      <p>{line}</p>
      <p>{intro}</p>
    </div>
  );
}
