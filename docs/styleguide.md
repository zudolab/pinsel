# Styleguide

`apps/styleguide` is the developer catalog of `@pinsel/ui`: every component story and the approved design tokens. It is a local and CI-checked build only; it is never deployed and the public site and the authoring Worker do not include it.

## Run it

```sh
pnpm --filter @pinsel/styleguide dev     # zfb dev on http://localhost:4397 (mirrors pinsel-ui/public first)
pnpm build:sg                            # static build to apps/styleguide/dist
pnpm sg:check                            # shims + registry + token manifest are up to date
pnpm --filter @pinsel/styleguide check   # sg:check + typecheck
```

`dev` and `build` first run `scripts/sync-assets.mjs`, which mirrors `packages/pinsel-ui/public/` into the gitignored `apps/styleguide/public/` so story previews load `/assets/fonts/fonts.css`, the instructor photo and the illustrations exactly like the public site.

## Where stories live

Stories are co-located with components: `packages/pinsel-ui/src/<name>/<name>.stories.tsx` (a default `StoryMeta` plus named `Story` exports). Basenames must be unique across `packages/pinsel-ui/src`. Composed previews of whole pages (category `Pages`) are in `packages/pinsel-ui/src/stories/pages.stories.tsx`; shared sample data is `src/stories/samples.ts`.

zfb refuses a collection root outside the app, so `apps/styleguide/ui/<name>/<name>.stories.tsx` holds generated two-line re-exports. After adding, renaming or removing a story run:

```sh
pnpm --filter @pinsel/styleguide gen-story-shims
pnpm --filter @pinsel/styleguide gen-registry
pnpm --filter @pinsel/styleguide gen-token-manifest
```

and commit `ui/**` and `src/styleguide/*.ts`. CI runs `pnpm sg:check` (all three with `--check`) and `pnpm build:sg`; a stale generated file fails CI.

Story-only state props (`menuOpen`, `motionOn`, `previewState`, `current`, `open`) exist so a state is visible in a static preview; they are not part of the component pack.

## Tokens and the preview token panel

`zudo-sg.config.mjs` reads exactly two files, `packages/pinsel-ui/styles/tokens.css` and `colors.css`, and groups them under `tokens.spec` (palette, color roles, space-1..9, layout lengths, font families and sizes, radius, z-index). A token added to either file must also be added to `tokens.spec`, then run `gen-token-manifest`. The token panel and the Live CSS panel on `/components/<slug>` edit these variables inside the preview iframe only; nothing is written back.

Previews load `src/styles/preview-entry.css`: the fonts plus the byte-exact Pinsel `tokens.css`, `colors.css` and `components.css`. The host chrome (`src/styles/ui-tokens.css`) is the engine starter's and is not Pinsel design.

## Dependency guard

CI runs `pnpm dedupe --check`; keep `@lezer/common` single-versioned when bumping engine packages.
