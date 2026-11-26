# Pinsel

Website for Pinsel (online preparation classes for German art universities). It is built as static HTML with ZFB. Composer adoption is extending authoring from Content records to Sitemap pages, nested components and explicit shared ownership.

**Status: native Composer adoption in progress; not deployed.** For an already staged native workspace, run `pnpm dev` (or `pnpm dev:dogfood`) and open **http://127.0.0.1:4190/composer?native=1**. Startup validates existing authority and refuses missing/incomplete state; it never initializes or reseeds. For a fresh checkout, initialize a known-data stage explicitly using [the adoption guide](docs/composer-adoption.md). The owner confirmed that prior prototype content was dummy data, and [#57](https://github.com/zudolab/pinsel/issues/57) closed without a cutover.

Authenticated full-CMS Assistant acceptance is **NOT_RUN** ([#58](https://github.com/zudolab/pinsel/issues/58)). Delivery remains disabled. See the [compatibility ledger](docs/composer-compatibility.md#current-candidate-at-a-glance) for package-specific browser coverage.

## Stack

- **Public site** (`apps/site`): [ZFB](https://github.com/Takazudo/zudo-front-builder) 5.1.5 with zudo-react. It emits static HTML with no JS by default, plus three visitor scripts (`*.client.ts`). It is served as Cloudflare Workers Static Assets (`apps/site/wrangler.jsonc`, no `main`).
- **Styleguide** (`apps/styleguide`): a zudo-sg 0.8.1 host (zudo-doc 9.1.1, zdtp 0.9.0) over `packages/pinsel-ui`. It is for developers only and is never part of the public output.
- **Native authoring** (`packages/pinsel-content`): installed full Composer with an explicit filesystem workspace, trusted production ZFB document renderer and exact public snapshot build path.
- **Shared packages**: `packages/pinsel-ui` holds the zudo-react components, the approved CSS and assets, and the `renderRouteDocument` bridge. `packages/pinsel-content` holds the content models, the editable-field policy, the site structure, the native authoring workspace and the assemble, project and check scripts.
- **Composer**: consumed only through immutable Git package pins for the tool and separately distributed component contract. Both importers and the lockfile share the identities recorded in [dependencies](docs/dependencies.md#current-state) and the [compatibility ledger](docs/composer-compatibility.md).

## Commands

Requires Node 24.x (`>=24 <25`) and pnpm 11.5.2 through corepack (`corepack enable`).

CI runs the baseline generators in this order (`.github/workflows/ci.yml`, job `build`). They do not consume or overwrite native authoring authority.

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm dev:dogfood` | Validate and open the existing native Composer workspace without initialization |
| `pnpm --filter @pinsel/content authoring:init` | Explicitly initialize a fresh stage from committed inputs after checking that all destinations are absent |
| `pnpm --filter @pinsel/content authoring:capture -- <new-file>` | Capture saved native authority after stopping the editor |
| `pnpm --filter @pinsel/content authoring:build -- <snapshot>` | Build only the captured native state into an isolated output directory |
| `pnpm install --frozen-lockfile` / `pnpm dedupe --check` | Install the pinned workspace and confirm there are no duplicate identities |
| `pnpm no-deploy:check` | Fail if any script or workflow could deploy, promote or publish |
| `pnpm assets:sync` | Copy `packages/pinsel-ui/public/` into `apps/site/public/` (gitignored) |
| `pnpm content:assemble` | Assemble `content/entries/**` and the structure into `.site-project/site-project.json` and `baseline.json` |
| `pnpm content:project` | Compile the project (`compileStaticSite`) into the ZFB route data `apps/site/data/routes.generated.ts` |
| `pnpm content:check` | Plan equals `tests/golden/routes.snapshot.json` (byte-exact while there is no `content/snapshot.json`, structure-only after that) |
| `pnpm build:site` | Build the committed baseline into `apps/site/dist` |
| `pnpm check` | `assets:verify` + `content:assemble` + `content:project` + `typecheck` + `test` (vitest) |
| `pnpm sg:check` / `pnpm build:sg` | Check the generated story shims, registry and token manifest, then build the styleguide |
| `pnpm check:token-layers` | Every design token in the built styleguide preview and site CSS is inside its cascade layer |
| `pnpm assets:verify` | Check every approved asset and every staged copy of it against the sha256 manifest |
| `pnpm check:boundaries` | Public dist allowlist and visitor scripts only; no editor, styleguide or Composer chrome |
| `pnpm test:browser` | Playwright lanes in `tests/browser/` (run through `heavy-guard` locally) |
| `pnpm check:approved-seed` | Hash-check every immutable fixture file against `tests/approved-seed.sha256.json` (CI job `approved-seed`) |
| `pnpm check:content` | The historical strict checker against `apps/site/dist`. CI job `migration-baseline` runs it on every CI run |

More checks, run by the verification passes: `pnpm site:check-fragments`, `pnpm site:wrangler-dev` (public Worker on `wrangler dev`), `pnpm verify:external-install` (Composer git-pin install in a fresh directory), and `node scripts/content/check-publication.mjs --dist apps/site/dist`. CI runs `node scripts/publication/check-public-output.mjs --dist apps/site/dist` in the build job. Content publication is stopped.


## Layout

```
apps/site               ZFB public site (pages, layout, site config, wrangler.jsonc for Static Assets)
apps/styleguide         zudo-sg developer catalog
packages/pinsel-ui      components, approved CSS/SVG art/assets, renderRouteDocument, stories, visitor scripts
packages/pinsel-content content models, policy, structure, assemble/project/check, publication checker
content/entries         canonical content records (the only paths the publisher writes, plus content/snapshot.json)
scripts/                asset, content, publication, boundary, guard and verification scripts
tests/fixtures/         immutable approved-seed migration fixture (never shipped, hash-pinned)
tests/golden/           pinned route plan
tests/browser/          Playwright lanes
docs/                   architecture, content model, Composer adoption, launch inputs, verification
```

## Documentation

- [Architecture](docs/architecture.md): how content becomes pages, plus the styleguide and boundaries
- [Content model](docs/content-model.md), [styleguide](docs/styleguide.md)
- [Dependencies](docs/dependencies.md) and [`ZUDO_DEPS_PINS.md`](ZUDO_DEPS_PINS.md)
- [Launch inputs](docs/launch-inputs.md): everything still undecided before a launch
- [Verification index](docs/verification/index.md): what each report proves and on which commit
