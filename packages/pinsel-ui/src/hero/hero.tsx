import type { Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow } from "../art-window/art-window";
import { ButtonLink, TextLink } from "../text-link/text-link";

export interface HeroProps {
  label: string;
  /** One `<span>` line each in the `h1#hero-title`. */
  titleLines: readonly string[];
  /** Line breaks in the stored lead are joined, as the approved page renders one paragraph. */
  lead: string;
  primaryLabel: string;
  primaryHref: string;
  pricingLabel: string;
  pricingHref: string;
}

/** The home hero (`build.py home()`): reading zone over the full hero art window. */
export function Hero(props: HeroProps): Child {
  return (
    <section class="hero" aria-labelledby="hero-title">
      <div class="container hero__reading reading-zone">
        <p class="hero__label">{props.label}</p>
        <h1 id="hero-title">
          {props.titleLines.map((line) => (
            <span>{line}</span>
          ))}
        </h1>
        <div class="hero__copy">
          <p>{props.lead.split(/\r?\n/).join("")}</p>
          <div class="hero__actions">
            <ButtonLink href={props.primaryHref} label={props.primaryLabel} primary />
            <TextLink href={props.pricingHref} label={props.pricingLabel} />
          </div>
        </div>
      </div>
      <ArtWindow slot="hero" size="hero" />
    </section>
  );
}
