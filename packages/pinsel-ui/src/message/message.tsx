import type { Child } from "@takazudo/zfb/zudo-react";
import { Paragraphs } from "../paragraphs/paragraphs";

export interface MessageProps {
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
}

/** The about `#message` block: heading column beside the message paragraphs. */
export function Message(props: MessageProps): Child {
  return (
    <section class="container message-layout reading-zone" id="message">
      <div>
        <p class="eyebrow">{props.eyebrow}</p>
        <h2 class="message-layout__heading">{props.title}</h2>
      </div>
      <Paragraphs paragraphs={props.paragraphs} />
    </section>
  );
}
