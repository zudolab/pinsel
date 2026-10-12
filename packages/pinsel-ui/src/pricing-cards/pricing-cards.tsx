import type { Child } from "@takazudo/zfb/zudo-react";
import { TextLink } from "../text-link/text-link";

export interface PricingCardProps {
  name: string;
  price: string;
  unit: string;
  description: string;
  featured: boolean;
  /** 1-based course position; the contact form preselects `?course=N`. */
  courseIndex: number;
  taxLabel: string;
  popularBadge: string;
  linkLabel: string;
}

/** One `article.pricing-card` of the approved home pricing grid (`ui.py pricing_cards()`). */
export function PricingCard(props: PricingCardProps): Child {
  return (
    <article class="pricing-card">
      <div class="pricing-card__top">
        <h3>{props.name}</h3>
        {props.featured ? <span class="pricing-card__popular">{props.popularBadge}</span> : null}
      </div>
      <p class="price">
        {props.price}
        <span>{props.taxLabel}</span>
      </p>
      <p class="pricing-card__unit">{props.unit}</p>
      <p class="pricing-card__description">{props.description}</p>
      <TextLink href={`/contact/?course=${props.courseIndex}`} label={props.linkLabel} />
    </article>
  );
}

export interface PricingCardsProps {
  note: string;
  moreLabel: string;
  moreHref: string;
  /** Composer slot: one `pinsel.pricing-card` per course, in collection order. */
  items?: readonly unknown[];
}

export function PricingCards(props: PricingCardsProps): Child {
  return (
    <>
      <div class="pricing-grid">{(props.items ?? []) as Child}</div>
      <p class="price-note">{props.note}</p>
      <div class="section-after">
        <TextLink href={props.moreHref} label={props.moreLabel} />
      </div>
    </>
  );
}
