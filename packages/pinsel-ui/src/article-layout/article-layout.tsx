import type { Child } from "@takazudo/zfb/zudo-react";
import { parseMarkdown } from "../markdown/safe-markdown";
import { Prose } from "../prose/prose";
import { directoryPath } from "../nav-link/nav-link";
import type { RouteContext } from "../render/types";
import { TextLink } from "../text-link/text-link";
import { Toc, TocItem } from "../toc/toc";

export interface RelatedNoteProps {
  href: string;
  title: string;
  /** Injected by the renderer; the current note renders as `span[aria-current=page]`. */
  route?: RouteContext;
}

/** One `li` of the All Notes list. */
export function RelatedNote({ href, title, route }: RelatedNoteProps): Child {
  return <li>{route && directoryPath(route.pathname) === directoryPath(href) ? <span aria-current="page">{title}</span> : <TextLink href={href} label={title} />}</li>;
}

export interface ArticleLayoutProps {
  /** The note body in the approved Markdown subset. */
  markdown: string;
  contentsLabel: string;
  allNotesLabel: string;
  /** `pinsel.related-note` children. */
  related?: readonly unknown[];
}

/** A note article: the Contents rail built from the body's h2s beside the prose and the All Notes list. */
export function ArticleLayout(props: ArticleLayoutProps): Child {
  const headings = parseMarkdown(props.markdown).flatMap((block) => (block.kind === "heading" ? [block] : []));
  return (
    <div class="container article-layout">
      <aside>
        <Toc label={props.contentsLabel} wide={false} items={headings.map((heading, index) => TocItem({ label: heading.text, target: heading.id, prefix: "", index: index + 1 }))} />
      </aside>
      <article>
        <Prose markdown={props.markdown} />
        <section class="article-related" aria-label="すべてのノート">
          <h2>{props.allNotesLabel}</h2>
          <ul class="simple-list">{(props.related ?? []) as Child}</ul>
        </section>
      </article>
    </div>
  );
}
