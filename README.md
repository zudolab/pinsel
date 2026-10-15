# Pinsel

Website for Pinsel (online preparation classes for German art universities). It is built as static HTML with ZFB, and a constrained Composer-based CMS lets editors change content only.

**Status: implemented, not deployed.** All 13 content routes and the 404 page render as complete static HTML. The private authoring Worker, the editor, the preview and the Git publication adapter are implemented and verified locally, with local D1, fixture identities and a fake publication provider. Nothing is deployed and no Cloudflare resource is provisioned. Publication is off (`PUBLISHER_PROVIDER=disabled`), and contact delivery is a local simulation. The decisions still open are listed in [`docs/launch-inputs.md`](docs/launch-inputs.md).

## Stack

- **Public site** (`apps/site`): [ZFB](https://github.com/Takazudo/zudo-front-builder) 4.5.2 with zudo-react. It emits static HTML with no JS by default, plus three visitor scripts (`*.client.ts`). It is served as Cloudflare Workers Static Assets (`apps/site/wrangler.jsonc`, no `main`).
- **Styleguide** (`apps/styleguide`): a zudo-sg 0.5.4 host (zudo-doc 6.2.0, zdtp 0.8.6) over `packages/pinsel-ui`. It is for developers only and is never part of the public output.
- **Editor** (`apps/editor`): Vite and Preact. It hosts the Composer content-only editor (`zudo-composer/content-editor`) and shows the Japanese save and publication states.
- **Authoring Worker** (`apps/authoring-worker`): a private Cloudflare Worker (wrangler 4.149.0). It provides Access JWT checks with jose, D1 drafts, revisions, immutable snapshots and publication jobs, the JSON content API, server-side preview rendering and the GitHub publication adapter. It is never deployed from this repository.
- **Shared packages**: `packages/pinsel-ui` holds the zudo-react components, the approved CSS and assets, and the `renderRouteDocument` bridge. `packages/pinsel-content` holds the content models, the editable-field policy, the site structure and the assemble, project and check scripts.
- **Composer**: `zudo-composer` and `@zudo-composer/component-contract` are pinned by git SHA only (`547b532e…` and `c0b452da…`). See [`docs/dependencies.md`](docs/dependencies.md).

## Commands

Requires Node 24 (`>=22.13.0`) and pnpm 11.5.2 through corepack (`corepack enable`).

CI runs these in this order (`.github/workflows/ci.yml`, job `build`). `pnpm build:site` must come before `pnpm check`, because the Worker tests compare their in-workerd render with `apps/site/dist/index.html`.

| Command | What it does |
| --- | --- |
| `pnpm install --frozen-lockfile` / `pnpm dedupe --check` | Install the pinned workspace and confirm there are no duplicate identities |
| `pnpm no-deploy:check` | Fail if any script or workflow could deploy, promote or publish |
| `pnpm assets:sync` | Copy `packages/pinsel-ui/public/` into `apps/site/public/` (gitignored) |
| `pnpm content:assemble` | Assemble `content/entries/**` and the structure into `.site-project/site-project.json` and `baseline.json`, and generate the Worker preview styles |
| `pnpm content:project` | Compile the project (`compileStaticSite`) into the ZFB route data `apps/site/data/routes.generated.ts` |
| `pnpm content:check` | Plan equals `tests/golden/routes.snapshot.json` (byte-exact while there is no `content/snapshot.json`, structure-only after that) |
| `pnpm build:site` | `zfb build` of the public site into `apps/site/dist` |
| `pnpm check` | `assets:verify` + `content:assemble` + `content:project` + `typecheck` + `test` (vitest, including the workerd Worker suite on local D1) |
| `pnpm sg:check` / `pnpm build:sg` | Check the generated story shims, registry and token manifest, then build the styleguide |
| `pnpm check:token-layers` | Every design token in the built styleguide preview and site CSS is inside its cascade layer |
| `pnpm build:editor` / `pnpm assets:assemble-worker` | Build the editor, then stage `apps/authoring-worker/dist-assets/` (the ui assets first, then the editor build) |
| `pnpm assets:verify` | Check every approved asset and every staged copy of it against the sha256 manifest |
| `pnpm check:boundaries` | Public dist allowlist and visitor scripts only; the editor bundle has no zudo-react |
| `pnpm worker:dry-run` / `worker:bundle:check` / `worker:check-preview` / `worker:types:check` | Run `wrangler deploy --dry-run` (no upload), scan the bundle (no `node:`, Vite, Preact or local fixtures), check the preview, check `worker-configuration.d.ts` |
| `pnpm verify:auth` | Production entry under local Wrangler with per-run HTTPS JWKS; auth, CSRF, refusal isolation and authenticated save |
| `pnpm verify:publication` | Real price/FAQ save, immutable snapshot and publisher validation in a disposable checkout; preserves caller content and site dist |
| `pnpm test:browser` | Playwright lanes in `tests/browser/` (run through `heavy-guard` locally) |
| `pnpm check:approved-seed` | Hash-check every immutable fixture file against `tests/approved-seed.sha256.json` (CI job `approved-seed`) |
| `pnpm check:content` | The historical strict checker against `apps/site/dist`. CI job `migration-baseline` runs it only while there is no `content/snapshot.json` |

More checks, run by the verification passes: `pnpm site:check-fragments`, `pnpm site:wrangler-dev` (public Worker on `wrangler dev`), `pnpm verify:external-install` (Composer git-pin install in a fresh directory), `pnpm gate1:wrangler-dev`, and `node scripts/content/check-publication.mjs --dist apps/site/dist` together with `node scripts/publication/check-public-output.mjs --dist apps/site/dist`. Publication PRs are validated by `.github/workflows/content-validate.yml` ([`docs/publication.md`](docs/publication.md)).

Both local verification gates require the frozen install, content assembly, editor build and Worker asset assembly above. They run in every ordinary CI build, without application credentials or a prototype archive. Commit tracked changes before `verify:publication`: it rehearses the exact current Git HEAD. See [local verification](docs/verification/local-gates.md) for bounds, failure controls and sanitized reports.

## Layout

```
apps/site               ZFB public site (pages, layout, site config, wrangler.jsonc for Static Assets)
apps/styleguide         zudo-sg developer catalog
apps/editor             Composer content-only editor host
apps/authoring-worker   private Cloudflare authoring Worker (API, D1 migrations, preview, publisher)
packages/pinsel-ui      components, approved CSS/SVG art/assets, renderRouteDocument, stories, visitor scripts
packages/pinsel-content content models, policy, structure, assemble/project/check, publication checker
content/entries         canonical content records (the only paths the publisher writes, plus content/snapshot.json)
scripts/                asset, content, publication, boundary, guard and verification scripts
tests/fixtures/         immutable approved-seed migration fixture (never shipped, hash-pinned)
tests/golden/           pinned route plan
tests/browser/          Playwright lanes
docs/                   architecture, content model, editing, publication, launch inputs, verification
```

## Documentation

- [Architecture](docs/architecture.md): how content becomes pages, plus the Worker, editor, preview and boundaries
- [Content model](docs/content-model.md), [editing guide (Japanese)](docs/editing.md), [publication pipeline](docs/publication.md), [authoring Worker](docs/authoring-worker.md), [styleguide](docs/styleguide.md)
- [Dependencies](docs/dependencies.md) and [`ZUDO_DEPS_PINS.md`](ZUDO_DEPS_PINS.md)
- [Launch inputs](docs/launch-inputs.md): everything still undecided before a launch
- [Verification index](docs/verification/index.md): what each report proves and on which commit
