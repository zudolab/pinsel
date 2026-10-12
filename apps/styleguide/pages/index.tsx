// Host-owned catalog entry page; the engine owns /components* and /tokens.
import type { JSX } from "@takazudo/zfb/zudo-react/jsx-runtime";
import "./lib/_zudo-sg-islands";
// Imported directly so zfb's island scanner registers the preview token panel bootstrap.
import { BodyEndIslands } from "./lib/_body-end-islands";

export const frontmatter = { title: "Pinsel styleguide" };

export default function IndexPage(): JSX.Element {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Pinsel styleguide</title>
      </head>
      <body class="min-h-screen bg-bg font-sans text-base leading-normal text-fg">
        <main class="mx-auto flex max-w-[48rem] flex-col gap-vsp-lg px-hsp-lg py-vsp-2xl">
          <h1 data-host-index class="text-2xl font-bold leading-tight">Pinsel styleguide</h1>
          <p class="text-muted">Developer catalog of the <code>@pinsel/ui</code> components and the approved design tokens. Not part of the public site.</p>
          <nav aria-label="Styleguide" class="flex flex-wrap gap-hsp-md">
            <a href="/components" class="inline-flex px-hsp-sm py-vsp-sm font-semibold text-accent underline hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              Components
            </a>
            <a href="/tokens" class="inline-flex px-hsp-sm py-vsp-sm font-semibold text-accent underline hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              Design Tokens
            </a>
          </nav>
        </main>
        <BodyEndIslands />
      </body>
    </html>
  );
}
