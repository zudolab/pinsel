import { h, type Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow } from "../art-window/art-window";
import { ButtonLink } from "../text-link/text-link";

export interface CtaProps {
  /** The closing h2; a newline marks the line break. */
  heading: string;
  /** The page's CTA copy; a leading repeat of the heading is dropped, as the approved closing does. */
  subCopy: string;
  buttonLabel: string;
  /** `closing` art on the home, lessons and about pages; `small` elsewhere. */
  large: boolean;
}

// The approved closing heading breaks after お気軽に; stored copy is one line.
const KNOWN_BREAKS: Readonly<Record<string, readonly string[]>> = {
  "まずはお気軽にご相談ください。": ["まずはお気軽に", "ご相談ください。"],
};

export function ctaHeadingLines(heading: string): readonly string[] {
  if (heading.includes("\n")) return heading.split(/\r?\n/);
  return KNOWN_BREAKS[heading] ?? [heading];
}

/** Prototype `ui.py cta()` copy rule: the shared opening sentence is not repeated under the heading. */
export function ctaRemainder(heading: string, subCopy: string): string {
  const flat = heading.replace(/\r?\n/g, "");
  return flat && subCopy.startsWith(flat) ? subCopy.slice(flat.length) : subCopy;
}

/** Prototype `ui.py cta()`: the closing CONTACT section with its art window. */
export function Cta(props: CtaProps): Child {
  const lines = ctaHeadingLines(props.heading);
  const heading = lines.flatMap((line, index) => (index === 0 ? [line] : [h("br", {}), line]));
  return (
    <section class="closing">
      <div class="container closing__reading reading-zone">
        <div>
          <p class="eyebrow">CONTACT</p>
          <h2>{heading}</h2>
        </div>
        <div class="closing__action">
          <p>{ctaRemainder(props.heading, props.subCopy)}</p>
          <ButtonLink href="/contact/" label={props.buttonLabel} primary />
        </div>
      </div>
      <ArtWindow slot="closing" size={props.large ? "closing" : "small"} />
    </section>
  );
}
