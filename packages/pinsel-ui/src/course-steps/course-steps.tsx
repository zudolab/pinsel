import type { Child } from "@takazudo/zfb/zudo-react";
import type { SlotPosition } from "../render/types";
import { twoDigits } from "../toc/toc";

export interface CourseStepProps {
  title: string;
  description: string;
  position?: SlotPosition;
  index?: number;
}

export function CourseStep(props: CourseStepProps): Child {
  return (
    <article class="course-step">
      <p class="course-step__number" aria-hidden="true">
        {twoDigits(props.index ?? props.position?.index ?? 1)}
      </p>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
    </article>
  );
}

export interface CourseStepsProps {
  /** `pinsel.course-step` children. */
  items?: readonly unknown[];
}

/** The lessons 授業内容 cards, numbered 01–03. */
export function CourseSteps(props: CourseStepsProps): Child {
  return <div class="course-steps">{(props.items ?? []) as Child}</div>;
}
