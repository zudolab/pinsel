import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";
import type { SlotPosition } from "../render/types";

export interface FaqItemProps {
  question: string;
  answer: string;
  /** `details` id prefix: `home-q` on the home page, `category-<n>` on /faq/. */
  prefix: string;
  /** Open the first item of this list (the first /faq/ category). */
  openFirst: boolean;
  /** Injected by the renderer: the item's place in its list → `#<prefix>-<index>`. */
  position?: SlotPosition;
  /** Explicit index for direct use outside the renderer. */
  index?: number;
}

/** Prototype `ui.py faq()` item: `details > summary` (Q. + plus/minus) and the A. answer. */
export function FaqItem(props: FaqItemProps): Child {
  const index = props.index ?? props.position?.index ?? 1;
  return (
    <details id={`${props.prefix}-${index}`} open={props.openFirst && index === 1}>
      <summary>
        <span class="faq-list__q" aria-hidden="true">
          Q.
        </span>
        <span>{props.question}</span>
        <span class="faq-list__symbol" aria-hidden="true">
          <Icon name="plus" class="faq-open-icon" />
          <Icon name="minus" class="faq-close-icon" />
        </span>
      </summary>
      <div class="faq-list__answer">
        <span aria-hidden="true">A.</span>
        <p>{props.answer}</p>
      </div>
    </details>
  );
}

export interface FaqProps {
  /** `pinsel.faq-item` children. */
  items?: readonly unknown[];
}

export function Faq(props: FaqProps): Child {
  return <div class="faq-list">{(props.items ?? []) as Child}</div>;
}

export interface FaqCategoryProps {
  title: string;
  /** Injected by the renderer → `section#faq-<index>`. */
  position?: SlotPosition;
  index?: number;
  /** One `pinsel.faq` list. */
  content?: readonly unknown[];
}

/** A /faq/ category: `section.faq-category#faq-N` with its h2 and question list. */
export function FaqCategory(props: FaqCategoryProps): Child {
  const index = props.index ?? props.position?.index ?? 1;
  return (
    <section class="faq-category reading-zone" id={`faq-${index}`}>
      <h2>{props.title}</h2>
      {(props.content ?? []) as Child}
    </section>
  );
}
