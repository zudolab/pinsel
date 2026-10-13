# Public-site confirm pass (zudolab/pinsel#17)

Independent verification of the public site (`apps/site/dist`) against the approved prototype (`$SEED/prototype/dist`, seed 2026-10-12) and the brief.

> **Historical local results.** Sections 1–8 below were recorded on the local branch `pinsel-site-cms/confirm-site` (base `532bb8d`, fixes verified at `6b1199f`) before PR #20 was merged. They are not results for PR #27 or for `main`. For the post-merge state, see "Post-merge integration (PR #27)" at the end.

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

## Post-merge integration (PR #27)

PR #20 merged into `main` as `597d2fc`. The follow-up integration branch `fix/pinsel-post-merge-confirmation` (draft PR #27) is `main` plus the work below. Nothing is deployed. The public site is still only built and served locally (`zfb build`, `wrangler dev`).

### Recovered, not reconstructed

The original checkout's local-only commits were merged as-is (`5b95a24`, `325321e`). Their test counts in sections 1–8 are historical and are not claimed for PR #27.

| Commit | Change |
| --- | --- |
| `ae767f0` (with `68c5c5b`, `3624008`) | #17: token files in `layer(tokens)` on the site; brand and motion toggle named by their visible text; `tests/browser/public-site.spec.ts`; this report |
| `3f31dc0` | styleguide preview nests the Pinsel stack in `pinsel.*` layers; `check-token-layers.mjs` |
| `4b328fa`, `f28bbdb` | Worker preview wraps the inlined token files in `@layer tokens` |
| `41d79d1` | `pnpm check:token-layers` in the root scripts and in CI after `build:sg` |

### Added in PR #27

| Commit | Change |
| --- | --- |
| `5919ebb` | `axe-core` 4.14.0 as an exact root devDependency |
| `b8c9c5e` | axe loads from the pinned package (`createRequire(…).resolve("axe-core/axe.min.js")`, version asserted). `PINSEL_AXE` is removed, so the six axe checks always run, CI included. Adds a visible-text name check |
| `43917cb` | `tests/browser/token-layers.spec.ts`: the resolved cascade on the site, the Worker preview and the styleguide preview at 1440/1121/1119/769/767/390px, against the approved prototype values. It fails when any of the three layer fixes is removed (negative proof on #17) |
| `9d003e3` | the zoom and text-size overflow checks fall back to the recorded prototype overflow (`PROTOTYPE_OVERFLOW`, #26) when no reference dist is served |
| `64afe4f` | zfb family 4.4.0, zudo-sg 0.5.4 (`docs/dependencies.md`). The upstream impact assessment found no change to the public output |

### Lane results (lane commits, not the final head)

- `43917cb` (public lane, on #17): `pnpm test:browser` 81 passed, 15 skipped. With `PINSEL_REFERENCE_DIST=$SEED/prototype/dist`, `public-site.spec.ts` + `token-layers.spec.ts` gave 62 passed. axe returned `[]` on the six pages.
- `64afe4f` (dependency lane, on #19): clean frozen install, `dedupe --check`, the full CI-order pipeline, strict checker 14/14, `pnpm check` 365 passed / 15 skipped, `pnpm test:browser` 81 passed / 15 skipped, `verify:external-install` passed.

### Skips and their reasons

- 15 browser tests are reference-only: the 14 no-JS copy-parity checks and the token-layers measurement of the prototype dist. They need `PINSEL_REFERENCE_DIST` (the extracted seed's `prototype/dist`) and skip with that reason when it is absent, as in CI. No baseline is ever generated from the changed output.
- The 84-pair pixel comparison (`scripts/site/visual-compare.mjs --reference …`) also needs the reference. It was not part of the post-merge lane runs, so its 0.00% result above is historical.

### Still open

- zudolab/pinsel#26: `/contact/` at 390px with 150% text overflows by 8px, as the prototype does. The approved contact CSS is unchanged, and the regression guard stays.

### Final-head results

- Head: `ef256bde4e660556378fa495e3425547eaff633d` (code under test; the only later commit fills these result sections and changes no code). Local machine run on 2026-10-13 through `heavy-guard.sh`, verdict PASS, starting from deleted `node_modules`.
- Results (each command exit 0, in CI order):
  - `pnpm install --frozen-lockfile`, `pnpm dedupe --check`, `pnpm no-deploy:check`
  - `pnpm check:approved-seed` — 83 files, manifest sha256 `eecacda9…`
  - `pnpm assets:sync`, `pnpm content:assemble`, `pnpm content:project` (14 routes), `pnpm content:check` (246 entries, 14 routes, equals the golden)
  - `pnpm build:site` (16 pages), then `pnpm check` — vitest 412 passed, 15 skipped
  - `pnpm sg:check`, `pnpm build:sg` (50 pages), `pnpm check:token-layers` (44 tokens layered in the styleguide preview and the site dist)
  - `pnpm build:editor`, `pnpm assets:assemble-worker` (136 files), `pnpm assets:verify`, `pnpm check:boundaries`
  - `pnpm worker:dry-run`, `pnpm worker:bundle:check` (no node:/vite/preact/local fixture/seed/fake provider), `pnpm worker:check-preview`, `pnpm worker:types:check`
  - `pnpm verify:external-install`
  - `check-publication.mjs --dist apps/site/dist` (246 entries, 14 routes), `check-public-output.mjs` (153 files)
  - `pnpm check:content` — strict historical checker 14/14 (0 missing files/copy, 0 record/link/shared/metadata issues)
  - `pnpm site:check-fragments`, `pnpm site:wrangler-dev` (6/6), `pnpm gate1:wrangler-dev` (29 steps)
  - `node scripts/verify/worker-auth-probe.mjs` — 58/58 against the production entry with a local fixture JWKS
  - `pnpm test:browser` — 81 passed, 15 skipped. The 15 skips are the reference-only checks (no-JS copy parity on 14 routes and the prototype token measurement) with the reason "PINSEL_REFERENCE_DIST is not set"; axe-core 4.14.0 runs unconditionally.
  - `PINSEL_REFERENCE_DIST=<seed>/prototype/dist playwright test public-site.spec.ts token-layers.spec.ts` — 62 passed (reference-dependent checks against the verified approved prototype)
  - working tree clean afterwards
- Not performed: any live test (Access, remote D1, GitHub publication, Workers Builds, contact delivery). Nothing is deployed.
