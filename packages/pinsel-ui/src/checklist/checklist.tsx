import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";

export interface ChecklistItemProps {
  text: string;
}

export function ChecklistItem({ text }: ChecklistItemProps): Child {
  return (
    <li>
      <Icon name="check" class="checklist__mark" />
      <span>{text}</span>
    </li>
  );
}

export interface ChecklistProps {
  /** `pinsel.checklist-item` children. */
  items?: readonly unknown[];
}

/** Prototype `ui.py checklist()`. */
export function Checklist(props: ChecklistProps): Child {
  return <ul class="checklist">{(props.items ?? []) as Child}</ul>;
}
