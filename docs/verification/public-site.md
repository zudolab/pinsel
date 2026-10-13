# Public-site confirm pass (zudolab/pinsel#17)

Independent verification of the public site (`apps/site/dist`) against the approved prototype (`$SEED/prototype/dist`, seed 2026-10-12) and the brief.

- Tested branch `pinsel-site-cms/confirm-site`, base `base/pinsel-site-cms` @ `532bb8d`.
- The fixes below are verified at `6b1199f`.
- Machine: Linux WSL2, Node 24.13.1, pnpm 11.5.2, Playwright 1.64.0 (chromium).
- Every Playwright run went through `heavy-guard`.

## Two regressions found and fixed

| Finding | Fix |
| --- | --- |
| **Tokens outside their cascade layer.** `tokens.css` and `colors.css` are plain `:root` blocks, and `apps/site/styles/global.css` imported them unlayered. In the prototype they sit in `@layer tokens`. Unlayered rules beat every layer, so the `@layer responsive` overrides never applied: `--header-height` 5rem at ≤70rem and 4.75rem at ≤47.99rem, `--gutter` 1.5rem, `--space-section` 3.75rem, `--space-8` 3rem. At 1110px the header was 92px instead of 80px (`images/public-site-header-1110-before-fix.jpg`, site on top). The pixel diff was 6–13% from 1110px down. | `68c5c5b`: `@import "…tokens.css" layer(tokens)` (colors.css the same way). The built CSS now starts with `@layer tokens { :root … }`, and every pair is 0.00%. |
| **axe `label-content-name-mismatch` (serious, WCAG 2.5.3) on all six pages.** Inherited from the prototype: the brand link had `aria-label="Pinsel トップページ"` and the motion toggle had `aria-label="装飾の動きと色の変化"`. Neither contains the visible text. | `3624008`: the brand's visible wordmark is now its name. The toggle's visible `動き ON/OFF` is its name, and its purpose moved to `aria-describedby` (a `hidden` span). axe now reports `[]` on all six pages. Content checker still 14/14. |

The same unlayered-token import exists outside this lane: `apps/authoring-worker/scripts/generate-preview-styles.mjs` (Worker preview) and `apps/styleguide/src/styles/preview-entry.css`. I reported both to the manager.

## 1. Fresh clone → build → checkers: pass

Fresh `git clone` of the branch at `532bb8d` into a scratch dir, run in one heavy-guard run:

```
corepack pnpm install --frozen-lockfile        exit=0
corepack pnpm assets:sync                      exit=0  133 files
corepack pnpm assets:verify                    exit=0  R7-10 sha256 9b51ee95…2a22
corepack pnpm content:assemble / content:project   exit=0  14 routes
corepack pnpm typecheck                        exit=0
corepack pnpm content:check                    exit=0  246 entries, 14 routes, plan equals golden (a56eb8f7408c…)
zfb check (apps/site)                          exit=0  no errors
zfb build (apps/site)                          exit=0  16 pages
bash scripts/check-content.sh                  exit=0  pages 14, passed 14, metadataIssues 0
check-publication --dist apps/site/dist        exit=0  246 entries / 14 routes
check-public-output --dist apps/site/dist      exit=0  153 files, no repository-only material
build:editor + check:boundaries                exit=0
site:check-fragments                           exit=0
```

The worktree run after the fixes (`6b1199f`) gives the same results.
- Strict checker: `{'pages': 14, 'passed': 14, 'missingFiles': 0, 'missingCopy': 0, 'recordIssues': 0, 'linkIssues': 0, 'sharedIssues': 0, 'metadataIssues': 0}`.
- `pnpm test`: 36 files, 357 passed, 15 skipped.

## 2. Visual and breakpoint comparison: pass, all 84 pairs 0.00%

Command:

```
flock …port-8788.lock flock …port-8000.lock node scripts/site/visual-compare.mjs --reference $SEED/prototype/dist --out .reports/visual
```

How the comparison runs:
- `wrangler dev` serves the public Worker (`apps/site/wrangler.jsonc`). `python3 -m http.server` serves the prototype.
- Both sides use `reducedMotion: reduce` and a fixed `Date` (`2026-10-13T00:01:30Z`), so the pigment clock paints the same colours. Lazy images are forced to load.
- Screenshots are full-page.
- A pixel counts as different when any channel differs by more than 32.

Pixel diff in % (rows: pages; columns: widths in px). Every pair also has the same page height:

| Page | 1440 | 1280 | 1130 | 1110 | 1100 | 1030 | 1020 | 1000 | 770 | 768 | 767 | 760 | 390 | 360 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| `/lessons/` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00\* | 0.00 | 0.00 | 0.00\* | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| `/results/` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| `/faq/` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| `/notes/free-tuition/` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| `/contact/` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

\* The first run showed 0.38% / 0.27%. In both, the site's lazy R7-10 illustration had not loaded yet when the screenshot was taken. A recheck (`--pages /lessons/ --widths 1030,770`) gives 0.00%.

The widths cover these boundaries:
- 76rem container: 1440 / 1280;
- 70rem header collapse: 1130 / 1110;
- 64rem rail collapse: 1030 / 1020;
- 47.99rem mobile: 770 / 768 / 767 / 760;
- narrow phones: 390 / 360.

Pixel equality across them covers the container and prose widths, TOC rail widths, graduate stacking at ≤47.99rem, and the header collapse at 70rem.

Example pairs (site left, prototype right, scaled down) are in `images/public-site-{home-1440,home-390,lessons-767,faq-1020,contact-390}.jpg`. The full-size PNGs and diff PNGs are under `.reports/visual/<page>/<width>-{site,ref,diff}.png` (gitignored).

## 3–8. Browser lane: pass, 83/83

Command:

```
PINSEL_REFERENCE_DIST=$SEED/prototype/dist PINSEL_AXE=<axe-core 4.14.0>/axe.min.js pnpm exec playwright test
```

Result: 83 passed. `tests/browser/public-site.spec.ts` is new. The existing `gate1-no-js`, `visitor-scripts` and `editor` specs also pass.

| Check | Evidence |
| --- | --- |
| No-JS | All 14 outputs, with `javaScriptEnabled: false`: the `main` and footer visible text equals the prototype's, whitespace-normalised. 6 header / 7 footer links and `aria-current="page"` are correct per route (gate1-no-js). R7-10 `<img>` (naturalWidth 1254) sits beside the copy at 1440/768 and below all four paragraphs at 767/390. |
| Keyboard | Tab order: skip link, brand, 7 nav links (incl. Contact), motion toggle, then main. Each has an outline ≥ 2px. The skip link is visible on focus and moves focus to `main`. Mobile menu: Enter opens it, Tab enters the nav, Escape closes it and focus returns to the toggle. FAQ `summary` toggles with Enter and Space. |
| Fragments | Direct `/faq/#faq-3`, `/results/#year-2019年度`, `/lessons/#graduates` and `/notes/free-tuition/#section-4` land within 64px below the sticky header. In-page hash navigation moves focus to the target. A direct load doesn't move focus, the same as the prototype's `site.js`. |
| TOC | `aria-current="location"` follows faq-2→3→4 scrolling down and 3→2 scrolling back up. It also follows the reflow when FAQ disclosures above the reading line are opened (visitor-scripts + public-site). |
| Motion | Toggle OFF: scroll-behavior `smooth` → `auto`, parallax `transform: none`, and `data-art-phase` / `--art-back` stop. The setting persists as `pinsel-motion=off`. `prefers-reduced-motion: reduce` does the same and disables the toggle. A hidden document (visibility override) freezes the phase, which resumes when the document is visible again. Two tabs share `data-art-phase` and `--art-back` under one clock. |
| Contact | `?course=1/2/3` selects 有料進路相談 / 2ヶ月コース / 4ヶ月コース. `?course=0` and `?course=9` give 未定. Every field has a label, and name, email and message are `required`. Validation messages, focus on the first invalid field, `aria-invalid` / `aria-describedby`, 送信中... and the focused success panel all work, and so does the back link. No requests besides font subsets. The form has no `action`, and both notices say truthfully that nothing is sent. |
| Overflow | `scrollWidth <= innerWidth` on all 14 routes at 1440, 1280, 1130, 1110, 1030, 1020, 770, 768, 767, 760, 390 and 360. |
| Zoom / text size | At 200% zoom (720px viewport) and 150% root text at 1440: no clipped text and no horizontal scroll on the six pages. 150% text at 390: `/contact/` overflows by 8px, exactly as much as the prototype. This is inherited and filed as zudolab/pinsel#26. |
| Contrast | Computed from the CSS: body 5.35, muted 5.35 (on surface 5.72), action 6.08, active TOC 11.33, focus ring 6.08 (≥ 3). All meet AA. |
| axe-core 4.14.0 | No violations at all on `/`, `/lessons/`, `/results/`, `/faq/`, `/notes/free-tuition/` and `/contact/`. axe-core is not a repo dependency: it was fetched into a scratch dir and injected via `PINSEL_AXE`, and the lane skips when that is unset. |
| Isolation | `check:boundaries` and `check-public-output` pass: only allowlisted entries, the three visitor scripts, no Composer/SG/fixture/provenance strings, no editor selectors. `site:wrangler-dev` 6/6: `/lessons/` 200, `/lessons` 307 → `/lessons/`, `/nope/` 404 with the 404 page body, `/404.html` serves the 404 page (200 via `/404`), the R7-10 sha256 matches, and `/__zfb/routes.json` 404. |

## Post-merge follow-up (zudolab/pinsel#17, after PR #20)

- axe runs from the pinned root devDependency `axe-core` 4.14.0 (asserted via `axe.version`), so the six axe checks always run, CI included. `PINSEL_AXE` is gone.
- A named-by-visible-text check covers the brand links (header and footer: `Pinsel ART STUDY IN GERMANY`) and the motion toggle (name follows `動き ON` / `動き OFF`, description `装飾の動きと色の変化`).
- `tests/browser/token-layers.spec.ts` measures the real cascade at 1440, 1121, 1119, 769, 767 and 390px on the three render surfaces: the public site, the Worker preview of a saved snapshot (`wrangler dev --env local`) and the styleguide component preview (`Pages: Home: hero + pricing`). It checks the resolved `--header-height`, `--gutter`, `--space-section` and `--space-8`, the `.site-header__inner` min-block-size, the header box, and the `#pricing` section's padding and `.container` width. Expected values are the approved prototype CSS (`@layer tokens` defaults with the `@layer responsive` overrides at 70rem / 47.99rem / 23rem). The three surfaces must agree. In the styleguide, the zudo-sg canvas pads the story by 16px per side, so at 390px the header gets 358px and wraps the motion toggle onto a second row. The header box is not compared there; the cascade values still are.
- Reference-only checks (they need `PINSEL_REFERENCE_DIST` and skip with that reason when it is absent, as in CI): the 14 no-JS copy-parity checks, and the token-layers check that measures the prototype dist itself. The zoom / text-size checks use the reference when it is served. Without it they use `PROTOTYPE_OVERFLOW`, which was measured from the reference (#26). No baseline is generated from the changed output.
