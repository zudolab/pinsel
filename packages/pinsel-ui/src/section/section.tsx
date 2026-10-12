import type { Child } from "@takazudo/zfb/zudo-react";

export interface SectionProps {
  /** Fragment id (`pricing`, `for-you`, …); empty means no id. */
  id: string;
  eyebrow: string;
  /** Empty renders no `.section-heading` (the about profile and CV sections). */
  title: string;
  /** Optional `p.section-heading__intro` beside the heading. */
  intro?: string;
  /** `aria-label` for a section without a visible heading. */
  label?: string;
  /** `instructor` adds the home `instructor-layout` grid. */
  layout?: "default" | "instructor";
  content?: readonly unknown[];
}

/** Prototype `ui.py section()`: reading-zone section with an eyebrow + h2 heading. */
export function Section(props: SectionProps): Child {
  const layout = props.layout === "instructor" ? " instructor-layout" : "";
  return (
    <section class={`section container${layout} reading-zone`} id={props.id || null} aria-label={props.label || null}>
      {props.title ? (
        <div class="section-heading">
          <div>
            {props.eyebrow ? <p class="eyebrow">{props.eyebrow}</p> : null}
            <h2>{props.title}</h2>
          </div>
          {props.intro ? <p class="section-heading__intro">{props.intro}</p> : null}
        </div>
      ) : null}
      {(props.content ?? []) as Child}
    </section>
  );
}
