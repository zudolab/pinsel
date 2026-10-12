import type { Child } from "@takazudo/zfb/zudo-react";

export interface FragmentProps {
  content?: readonly unknown[];
}

/** A slot owner that renders no element: a place to attach a collection between page-level blocks. */
export function Fragment(props: FragmentProps): Child {
  return <>{(props.content ?? []) as Child}</>;
}
