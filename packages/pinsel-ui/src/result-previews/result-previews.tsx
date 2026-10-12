import type { Child } from "@takazudo/zfb/zudo-react";

export interface ResultPreviewProps {
  yearLabel: string;
  school: string;
  detail: string;
}

export function ResultPreview({ yearLabel, school, detail }: ResultPreviewProps): Child {
  return (
    <article class="result-preview">
      <p class="result-preview__year">{yearLabel}</p>
      <h3>{school}</h3>
      <p>{detail}</p>
    </article>
  );
}

export interface ResultPreviewsProps {
  /** `pinsel.result-preview` children. */
  items?: readonly unknown[];
}

/** The home 合格実績 cards. */
export function ResultPreviews(props: ResultPreviewsProps): Child {
  return <div class="results-preview">{(props.items ?? []) as Child}</div>;
}
