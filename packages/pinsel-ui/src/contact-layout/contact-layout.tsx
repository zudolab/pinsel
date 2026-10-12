import type { Child } from "@takazudo/zfb/zudo-react";
import type { SlotPosition } from "../render/types";
import { twoDigits } from "../toc/toc";

export interface StepProps {
  title: string;
  description: string;
  position?: SlotPosition;
  index?: number;
}

/** One `li` of `ol.step-flow`, numbered by its place in the list. */
export function Step(props: StepProps): Child {
  return (
    <li>
      <span class="step-flow__number" aria-hidden="true">
        {twoDigits(props.index ?? props.position?.index ?? 1)}
      </span>
      <div>
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
    </li>
  );
}

export interface StepFlowProps {
  /** `pinsel.step` children. */
  items?: readonly unknown[];
}

export function StepFlow(props: StepFlowProps): Child {
  return <ol class="step-flow">{(props.items ?? []) as Child}</ol>;
}

export interface ContactLayoutProps {
  stepsTitle: string;
  /** `pinsel.step` children. */
  steps?: readonly unknown[];
  /** The `pinsel.contact-form` panel. */
  panel?: readonly unknown[];
}

/** /contact/: the お申し込みの流れ aside beside the form panel (the panel moves first on mobile). */
export function ContactLayout(props: ContactLayoutProps): Child {
  return (
    <div class="container contact-layout">
      <aside class="contact-aside">
        <h2>{props.stepsTitle}</h2>
        <StepFlow items={props.steps} />
      </aside>
      {(props.panel ?? []) as Child}
    </div>
  );
}
