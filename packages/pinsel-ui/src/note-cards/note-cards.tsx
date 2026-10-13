import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";
import type { SlotPosition } from "../render/types";
import { twoDigits } from "../toc/toc";

export interface NoteCardProps {
  href: string;
  title: string;
  description: string;
  position?: SlotPosition;
  index?: number;
}

export function NoteCard(props: NoteCardProps): Child {
  return (
    <a class="note-card" href={props.href}>
      <span class="note-card__index" aria-hidden="true">
        {twoDigits(props.index ?? props.position?.index ?? 1)}
      </span>
      <div>
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
      <Icon name="arrow-right" class="note-card__arrow" />
    </a>
  );
}

export interface NoteCardsProps {
  /** The notes index layout (large editorial rows) instead of the lessons grid. */
  editorial: boolean;
  /** `pinsel.note-card` children. */
  items?: readonly unknown[];
}

/** Prototype `ui.py note_cards()`. */
export function NoteCards(props: NoteCardsProps): Child {
  return <div class={props.editorial ? "note-grid note-grid--editorial" : "note-grid"}>{(props.items ?? []) as Child}</div>;
}
