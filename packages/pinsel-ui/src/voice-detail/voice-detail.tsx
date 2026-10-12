import type { Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow } from "../art-window/art-window";
import type { SlotPosition } from "../render/types";

export interface VoiceDetailProps {
  author: string;
  yearLabel: string;
  school: string;
  department: string;
  /** One `<p>` per line. */
  quote: string;
  /** Place the page's middle art window after this testimonial (1-based); 0 = never. */
  artAfter: number;
  position?: SlotPosition;
  index?: number;
}

/** One full testimonial: `article#student-<index>` with its meta header and quote. */
export function VoiceDetail(props: VoiceDetailProps): Child {
  const index = props.index ?? props.position?.index ?? 1;
  return (
    <>
      <article class="container voice-detail reading-zone" id={`student-${index}`}>
        <header class="voice-detail__meta">
          <h2>{props.author}</h2>
          <p>{props.yearLabel}</p>
          <p>{props.school}</p>
          <p>{props.department}</p>
        </header>
        <blockquote>
          {props.quote.split("\n").map((line) => (
            <p>{line}</p>
          ))}
        </blockquote>
      </article>
      {props.artAfter === index ? <ArtWindow slot="middle" size="medium" drift={-1} /> : null}
    </>
  );
}
