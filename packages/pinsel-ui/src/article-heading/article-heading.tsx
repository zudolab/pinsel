import type { Child } from "@takazudo/zfb/zudo-react";
import { ArtWindow } from "../art-window/art-window";
import { Breadcrumb } from "../breadcrumb/breadcrumb";

export interface ArticleHeadingProps {
  title: string;
  description: string;
  eyebrow: string;
  /** The note's slug; a few approved titles break into phrases by slug. */
  slug: string;
  parentLabel: string;
  parentHref: string;
}

// The approved free-tuition heading keeps each phrase unbroken.
export const TITLE_PHRASES: Readonly<Record<string, readonly string[]>> = {
  "free-tuition": ["ドイツの美大は", "学費が無料"],
};

/** A note article's breadcrumb, heading block and ribbon art (`build.py note()`). */
export function ArticleHeading(props: ArticleHeadingProps): Child {
  const phrases = TITLE_PHRASES[props.slug];
  return (
    <>
      <Breadcrumb label={props.title} parentLabel={props.parentLabel} parentHref={props.parentHref} />
      <div class="container article-heading">
        <header class="page-heading reading-zone">
          <div>
            <p class="eyebrow">{props.eyebrow}</p>
            <h1>{phrases ? phrases.map((phrase) => <span class="title-phrase">{phrase}</span>) : props.title}</h1>
          </div>
          <div class="page-heading__description">
            <p>{props.description}</p>
          </div>
        </header>
      </div>
      <ArtWindow slot="hero" size="ribbon" />
    </>
  );
}
