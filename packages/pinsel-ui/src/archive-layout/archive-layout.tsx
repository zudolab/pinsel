import type { Child } from "@takazudo/zfb/zudo-react";
import { Toc } from "../toc/toc";

export interface ArchiveLayoutProps {
  /** The aside table of contents label (年度から見る / 質問のカテゴリー). */
  tocLabel: string;
  /** `pinsel.toc-item` children. */
  toc?: readonly unknown[];
  /** The year sections or FAQ categories. */
  body?: readonly unknown[];
}

/** Results and FAQ: sticky aside TOC rail beside the archive body (one column ≤64rem). */
export function ArchiveLayout(props: ArchiveLayoutProps): Child {
  return (
    <div class="container archive-layout">
      <aside>
        <Toc label={props.tocLabel} wide={false} items={props.toc} />
      </aside>
      <div class="archive-body">{(props.body ?? []) as Child}</div>
    </div>
  );
}
