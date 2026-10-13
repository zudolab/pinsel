import type { Child } from "@takazudo/zfb/zudo-react";
import { TextLink } from "../text-link/text-link";

export interface MoreLinkProps {
  href: string;
  label: string;
}

/** `div.section-after > a.text-link`: もっと見る and the other section-closing links. */
export function MoreLink({ href, label }: MoreLinkProps): Child {
  return (
    <div class="section-after">
      <TextLink href={href} label={label} />
    </div>
  );
}
