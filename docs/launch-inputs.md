# Launch inputs

These are the decisions, identifiers and one-time actions needed before Pinsel can launch. Unless a row says it is resolved, it has not been decided or done. Until a row is filled in here, code and config keep placeholders or a fail-closed default, and nothing guesses the value. Deployment, provisioning and live tests are not authorized in the development scope (zudolab/pinsel#1).

## Current status

- **Hosted Content is local dogfooding only.** `pnpm dev:dogfood` runs the real Worker against a persistent **local** D1; see [dogfooding](dogfooding.md). Nothing is deployed, and no remote D1, npm release or real email delivery exists.
- **The publication/delivery path is stopped.** The current Worker answers every publication request with `configuration-required` (`apps/authoring-worker/src/site/baseline.ts`), and no GitHub provider or scheduled delivery is wired into it. Confirmed snapshots are built only locally with `pnpm build:snapshot` (output `.dogfood/builds/<id>/`). The older publication pipeline was removed on 2026-11-07; its design survives only in the git history of `docs/publication.md`.
- **Composer** is consumed through two distinct package-root git pins, `zudo-composer#13ed855a3268d91c114c3f5ee167d9ace9078d57` and `@zudo-composer/component-contract#c0b452da075b66757c60bd0d721a47062d4354d0`; see [dependencies](dependencies.md#current-state).

## Hosting and identity

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Public hostname | public site Worker (`apps/site/wrangler.jsonc` routes), canonical/OGP/sitemap origin | `siteConfig.origin` is `https://pinsel-germany.com` (`apps/site/lib/site-config.ts`, taken from the approved source metadata). No route or custom domain is configured. `workers_dev` / `preview_urls` are off. | _undecided_: confirm the origin and attach the domain |
| Admin (authoring) hostname | authoring Worker, Access application | No route or custom domain. `workers_dev` / `preview_urls` are off, so there is no `workers.dev` bypass. | _undecided_ |
| Cloudflare Access team domain | `TEAM_DOMAIN` (JWT issuer and JWKS host, must be `https://`) | empty → `503 configuration-required` on every route | _undecided_ |
| Access application AUD tag | `POLICY_AUD` | empty → `503 configuration-required` | _undecided_ |
| Login method | Access identity provider | One-time PIN is recommended. It must be enabled explicitly on a new Zero Trust organization. | _undecided_ |
| Editor allowlist (emails) | Access Allow policy and `EDITOR_ALLOWLIST` (the Worker checks both) | empty → `503 configuration-required` | _undecided_ |

## Data

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| D1 database ids (production, and preview if used) | `d1_databases` in `apps/authoring-worker/wrangler.jsonc` | placeholder `00000000-0000-4000-8000-000000000000`; only local D1 has been used | _undecided_: `wrangler d1 create pinsel-authoring` at launch |
| Remote D1 migrations | the five files in `apps/authoring-worker/migrations/` (`0001_init` … `0005_content_ai`, including `0004_hosted_content`) | applied only with `--local` (by `pnpm dev:dogfood` and the tests). `wrangler d1 migrations apply pinsel-authoring --remote` has never run. | _not done_ |
| Initial Hosted Content head | first Worker request on the remote D1 | the Worker initializes `pinsel_hosted_head` from the assembled baseline on first use (`ensureHostedSeeded`, `apps/authoring-worker/src/site/baseline.ts`), or refuses when an old draft needs explicit migration. This has run only against local D1. | _not done_ |

## Publication and delivery

The current Worker does not read the publisher variables below; they are inputs of the stopped publication design and become live decisions only if a delivery path is re-enabled in a separately authorized change.

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Delivery path itself | turning confirmed snapshots into the public site | **stopped**: publication answers `configuration-required`; only local `pnpm build:snapshot` exists ([dogfooding](dogfooding.md)) | _undecided, not authorized_ |
| Publisher identity and credentials | a GitHub (or other) delivery provider | `PUBLISHER_PROVIDER` is `disabled` in `wrangler.jsonc`. No token exists and no provider is wired into the Worker. | _undecided_ |
| Promotion policy | `PROMOTION_POLICY` (manual merge vs automatic promotion) | `manual` in `wrangler.jsonc`, unused while delivery is stopped | _undecided_ |
| Required checks / branch protection on `main` | the repository's branch rules | `main` is not protected, and no ruleset exists | _undecided_. Suggested required checks: `content-gate` and `approved-seed` (ci.yml), `build` (ci.yml), plus whatever the re-enabled delivery path validates. Also: up to date before merging, no force pushes or deletions |
| Scheduled reconciliation | a `triggers.crons` entry in `wrangler.jsonc` | no cron | _undecided_ |
| Cloudflare build / deployment connection | publishing integrated content; a `live` state | Workers Builds is **not connected**. No deployment evidence exists. | _undecided, not authorized_ |
| Unused repository variable `PINSEL_MIGRATION_CHECKER` | nothing (it was the old switch for the migration checker) | last recorded as still set to `enabled`; since `4b42013` the `migration-baseline` job is unconditional and no workflow reads the variable. Not re-checked here (repository variables are not readable from this environment). | _remove_: a repository-settings change, left to the maintainer |

## Public site policy

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Indexing / canonical policy | `siteConfig.indexing` (`apps/site/lib/site-config.ts`): meta robots, `robots.txt`, sitemap | `noindex`: every page has `noindex,nofollow` and `robots.txt` is `Disallow: /`, as in the approved preview. Canonical and `og:url` use `siteConfig.origin`. | _undecided_: switch to `index` at launch |
| Contact delivery | the contact form (`/contact/`) | a local simulation. The form has no `action`, nothing is sent, and both notices say so. | _undecided_: provider and recipient |

## Local acceptance still open

- **Real-CLI Note AI acceptance is NOT_RUN.** Only the fake provider has been verified end to end; fake success is not real CLI or model success. The bounded manual procedure (one provider, at most 10 minutes and 2 Prepares) is in [note-ai-acceptance.md](note-ai-acceptance.md) and must run on a machine with a supported, already-authenticated CLI.
- No live test has been performed: Access, remote D1, delivery, Workers Builds and contact delivery.

## Resolved

- **zudolab/pinsel#26 (contact page overflow at 390px with 150% text): resolved.** The issue is closed as completed (2026-11-03). The mobile `.contact-layout` rule now uses `grid-template-columns: minmax(0, 1fr)` (`packages/pinsel-ui/styles/components.css`), and `tests/browser/public-site.spec.ts` asserts that `/contact/` fits 390px at 100%, 150% and 200% text with no overflow allowance. The historical approved seed is unchanged.
