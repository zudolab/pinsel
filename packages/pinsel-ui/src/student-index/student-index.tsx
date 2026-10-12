import type { Child } from "@takazudo/zfb/zudo-react";
import type { SlotPosition } from "../render/types";

export interface StudentLinkProps {
  author: string;
  school: string;
  position?: SlotPosition;
  index?: number;
}

/** One entry of the voices index, linking `#student-<index>`. */
export function StudentLink(props: StudentLinkProps): Child {
  return (
    <a href={`#student-${props.index ?? props.position?.index ?? 1}`}>
      <strong>{props.author}</strong>
      <span>{props.school}</span>
    </a>
  );
}

export interface StudentIndexProps {
  /** `pinsel.student-link` children. */
  items?: readonly unknown[];
}

/** The voices page index of the five testimonials. */
export function StudentIndex(props: StudentIndexProps): Child {
  return (
    <nav class="container student-index" aria-label="生徒の声から選ぶ">
      {(props.items ?? []) as Child}
    </nav>
  );
}
