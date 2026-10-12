import type { Child } from "@takazudo/zfb/zudo-react";

export interface TimelineEntryProps {
  year: string;
  text: string;
}

export function TimelineEntry({ year, text }: TimelineEntryProps): Child {
  return (
    <li>
      <span class="timeline__year">{year}</span>
      <p>{text}</p>
    </li>
  );
}

export interface TimelineProps {
  /**
   * `plain`: the list alone; `cv`: a column with `h2.cv-heading` (about
   * 経歴 / 学歴); `career`: `div.section-after` with `h3.lesson-career-title`
   * (the lessons instructor section).
   */
  variant: "plain" | "cv" | "career";
  title: string;
  /** `pinsel.timeline-entry` children. */
  items?: readonly unknown[];
}

/** Prototype `ui.py timeline()` and the headings the pages put above it. */
export function Timeline(props: TimelineProps): Child {
  const list = <ol class="timeline">{(props.items ?? []) as Child}</ol>;
  if (props.variant === "cv") {
    return (
      <div>
        <h2 class="cv-heading">{props.title}</h2>
        {list}
      </div>
    );
  }
  if (props.variant === "career") {
    return (
      <div class="section-after">
        <h3 class="lesson-career-title">{props.title}</h3>
        {list}
      </div>
    );
  }
  return list;
}
