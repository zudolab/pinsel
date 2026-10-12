import type { Child } from "@takazudo/zfb/zudo-react";

export interface SectionProps {
  /** Fragment id (`pricing`, `for-you`, …); empty means no id. */
  id: string;
  eyebrow: string;
  title: string;
  content?: readonly unknown[];
}

/** Prototype `ui.py section()`: reading-zone section with an eyebrow + h2 heading. */
export function Section(props: SectionProps): Child {
  return (
    <section class="section container reading-zone" id={props.id || null}>
      <div class="section-heading">
        <div>
          {props.eyebrow ? <p class="eyebrow">{props.eyebrow}</p> : null}
          <h2>{props.title}</h2>
        </div>
      </div>
      {(props.content ?? []) as Child}
    </section>
  );
}
