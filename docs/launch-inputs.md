# Launch inputs

These are the decisions, identifiers and one-time actions needed before Pinsel can launch. None of them has been made or done. Until a row is filled in here, code and config keep placeholders or a fail-closed default, and nothing guesses the value. Deployment, provisioning and live tests are not authorized in the development scope (zudolab/pinsel#1).

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
| Remote D1 migrations | the three files in `apps/authoring-worker/migrations/` (`0001_init`, `0002_publication`, `0003_publication_reconcile`) | applied only with `--local`. `wrangler d1 migrations apply pinsel-authoring --remote` has never run. | _not done_ |
| Initial draft seed | first Worker start on the remote D1 | the production entry seeds from the assembled baseline. `POST /admin/seed` exists only in the local entry. | _not done_ |

## Publication

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Publisher identity and credentials | `PUBLISHER_GITHUB_TOKEN` (Worker **secret**: a GitHub App installation token or fine-grained token with `contents: write`, `pull_requests: write` and `checks: read` on this repository only), `PUBLISHER_GITHUB_REPOSITORY`, then `PUBLISHER_PROVIDER=github` | `PUBLISHER_PROVIDER=disabled`. No token exists, and the variables are not declared in `wrangler.jsonc`. | _undecided_ |
| Promotion policy | `PROMOTION_POLICY` | `manual` (a maintainer merges each content PR). `auto` merges a validated PR at its validated head and honours branch rules. | _undecided_ |
| Required checks / branch protection on `main` | `PUBLISHER_GITHUB_REQUIRED_CHECKS` (default `content-validate`) and the repository's branch rules | `main` is not protected, and no ruleset exists | _undecided_. Suggested required checks: `content-gate` and `approved-seed` (ci.yml), `build` (ci.yml), and for content PRs `content-validate` plus the `pinsel/publication-identity` check run. Also: up to date before merging, only the publisher identity may push `content/*`, no force pushes or deletions |
| Scheduled reconciliation | a `triggers.crons` entry in `wrangler.jsonc` plus `PUBLICATION_RECONCILE_SCHEDULE=enabled` | no cron. Job status advances only when the editor reads it. | _undecided_ |
| Cloudflare build / deployment connection | publishing integrated content; the `live` state | Workers Builds is **not connected**. No provider reports deployment evidence, so `live` is never shown. | _undecided, not authorized_ |
| Unused repository variable `PINSEL_MIGRATION_CHECKER` | nothing (it was the old switch for the migration checker) | still set to `enabled` on the repository. Since `4b42013` the `migration-baseline` job is unconditional and no workflow reads the variable. | _remove_: a repository-settings change, left to the maintainer |

## Public site policy

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| Indexing / canonical policy | `siteConfig.indexing` (`apps/site/lib/site-config.ts`): meta robots, `robots.txt`, sitemap | `noindex`: every page has `noindex,nofollow` and `robots.txt` is `Disallow: /`, as in the approved preview. Canonical and `og:url` use `siteConfig.origin`. | _undecided_: switch to `index` at launch |
| Contact delivery | the contact form (`/contact/`) | a local simulation. The form has no `action`, nothing is sent, and both notices say so. | _undecided_: provider and recipient |

## Design decision pending

| Input | Needed by | Current state | Decision |
| --- | --- | --- | --- |
| zudolab/pinsel#26: contact page overflow at 390px with 150% text | `.contact-layout` mobile rule in the approved `packages/pinsel-ui/styles/components.css` | `/contact/` is 8px wider than the viewport at that setting, exactly like the approved prototype. `tests/browser/public-site.spec.ts` ("150% text, narrow") fails if it gets worse. The likely fix, `grid-template-columns: minmax(0, 1fr)`, changes approved component CSS. | _undecided_: needs a design decision |

## Not required for launch, recorded for completeness

- The Composer feature PR Takazudo/zudo-composer#904 is still a draft. Pinsel consumes its reachable SHA `547b532eb56dfecaec1e2bd9060f8d579ad8862c` (and component-contract `c0b452da075b66757c60bd0d721a47062d4354d0`). Merging upstream is a separate decision, and so is moving the pin.
- No live test has been performed: Access, remote D1, GitHub publication, Workers Builds and contact delivery.
