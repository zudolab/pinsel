import type { Child } from "@takazudo/zfb/zudo-react";

export interface SkipLinkProps {
  label?: string;
}

/** Visually hidden until focused; jumps to `main#main`. */
export function SkipLink({ label = "本文へスキップ" }: SkipLinkProps): Child {
  return (
    <a class="skip-link" href="#main">
      {label}
    </a>
  );
}
