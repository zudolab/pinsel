import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";
import type { SlotPosition } from "../render/types";

export interface TocItemProps {
  label: string;
  /** Fragment id without `#`; empty → `<prefix><index>` (`faq-3`). */
  target: string;
  prefix: string;
  /** Injected by the renderer: drives the `01` numbering and positional targets. */
  position?: SlotPosition;
  index?: number;
}

export const twoDigits = (index: number): string => String(index).padStart(2, "0");

/** One `li > a[href^="#"]` of a page table of contents; the visitor script marks it `aria-current="location"`. */
export function TocItem(props: TocItemProps): Child {
  const index = props.index ?? props.position?.index ?? 1;
  const target = props.target || `${props.prefix}${index}`;
  return (
    <li>
      <a href={`#${target}`}>
        <span aria-hidden="true">{twoDigits(index)}</span>
        {props.label}
      </a>
    </li>
  );
}

export interface TocProps {
  label: string;
  /** The lessons page variant: a full-width container band instead of an aside rail. */
  wide: boolean;
  /** `pinsel.toc-item` children. */
  items?: readonly unknown[];
}

/** Prototype `ui.py toc()`. */
export function Toc(props: TocProps): Child {
  return (
    <nav class={props.wide ? "page-toc page-toc--wide container" : "page-toc"} aria-label={props.label}>
      <p class="eyebrow">
        <Icon name="contents" />
        <span>{props.label}</span>
      </p>
      <ol>{(props.items ?? []) as Child}</ol>
    </nav>
  );
}
