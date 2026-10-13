import type { Child } from "@takazudo/zfb/zudo-react";

export interface TwoColumnProps {
  columns?: readonly unknown[];
}

/** `div.two-column`: two equal columns, stacked on mobile. */
export function TwoColumn(props: TwoColumnProps): Child {
  return <div class="two-column">{(props.columns ?? []) as Child}</div>;
}
