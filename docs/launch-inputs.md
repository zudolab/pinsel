# Launch inputs

These are the decisions, identifiers and one-time actions needed before Pinsel can launch. Unless a row says it is resolved, it has not been decided or done. Until a row is filled in here, code and config keep placeholders or a fail-closed default, and nothing guesses the value. Deployment, provisioning and live tests are not authorized in the development scope (zudolab/pinsel#1).

## Current status

- **Authoring is local only.** `pnpm dev` opens an existing native Composer workspace after explicit initialization; see [Composer adoption](composer-adoption.md). Nothing is deployed, and no npm release or real email delivery exists.
- **The publication/delivery path is stopped.** No delivery provider or scheduled delivery is wired in. Verify saved CMS output locally with `authoring:capture` and `authoring:build` from `@pinsel/content`.
- **Composer** and its component contract use immutable Git pins in `packages/pinsel-content` and `packages/pinsel-ui`. See the [current compatibility ledger](composer-compatibility.md#current-candidate-at-a-glance).

## Hosting and identity

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Public hostname | public site Worker (`apps/site/wrangler.jsonc` routes), canonical/OGP/sitemap origin | `siteConfig.origin` is `https://pinsel-germany.com` (`apps/site/lib/site-config.ts`, taken from the approved source metadata). No route or custom domain is configured. `workers_dev` / `preview_urls` are off. | _undecided_: confirm the origin and attach the domain |

## Publication and delivery

The inputs below are decisions of the stopped publication design and become live only if a delivery path is added in a separately authorized change.

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Delivery path itself | turning confirmed snapshots into the public site | **stopped**: only local native snapshot builds exist | _undecided, not authorized_ |
| Required checks / branch protection on `main` | the repository's branch rules | `main` is not protected, and no ruleset exists | _undecided_. Suggested required checks: `content-gate` and `approved-seed` (ci.yml), `build` (ci.yml), plus whatever the re-enabled delivery path validates. Also: up to date before merging, no force pushes or deletions |
| Cloudflare build / deployment connection | publishing integrated content; a `live` state | Workers Builds is **not connected**. No deployment evidence exists. | _undecided, not authorized_ |
| Unused repository variable `PINSEL_MIGRATION_CHECKER` | nothing (it was the old switch for the migration checker) | last recorded as still set to `enabled`; since `4b42013` the `migration-baseline` job is unconditional and no workflow reads the variable. Not re-checked here (repository variables are not readable from this environment). | _remove_: a repository-settings change, left to the maintainer |

## Public site policy

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Indexing / canonical policy | `siteConfig.indexing` (`apps/site/lib/site-config.ts`): meta robots, `robots.txt`, sitemap | `noindex`: every page has `noindex,nofollow` and `robots.txt` is `Disallow: /`, as in the approved preview. Canonical and `og:url` use `siteConfig.origin`. | _undecided_: switch to `index` at launch |
| Contact delivery | the contact form (`/contact/`) | a local simulation. The form has no `action`, nothing is sent, and both notices say so. | _undecided_: provider and recipient |

## Local acceptance still open

- Authenticated full-CMS Assistant acceptance is **NOT_RUN** ([#58](https://github.com/zudolab/pinsel/issues/58)).
- Not live-tested: delivery, Workers Builds and contact delivery.

## Resolved

- **zudolab/pinsel#26 (contact page overflow at 390px with 150% text): resolved.** The issue is closed as completed (2026-11-03). The mobile `.contact-layout` rule now uses `grid-template-columns: minmax(0, 1fr)` (`packages/pinsel-ui/styles/components.css`), and `tests/browser/public-site.spec.ts` asserts that `/contact/` fits 390px at 100%, 150% and 200% text with no overflow allowance. The historical approved seed is unchanged.
