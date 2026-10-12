import type { Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow } from "../art-window/art-window";
import { ButtonLink } from "../text-link/text-link";

export interface NotFoundProps {
  title: string;
  body: string;
  linkLabel: string;
}

/** The 404 page block and its closing art (`build.py not_found()`). */
export function NotFound(props: NotFoundProps): Child {
  return (
    <>
      <section class="container not-found reading-zone">
        <p class="not-found__number" aria-hidden="true">
          404
        </p>
        <h1>{props.title}</h1>
        <p>{props.body}</p>
        <ButtonLink href="/" label={props.linkLabel} />
      </section>
      <ArtWindow slot="closing" size="medium" />
    </>
  );
}
