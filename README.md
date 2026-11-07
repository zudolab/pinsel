# Pinsel

Website for Pinsel (online preparation classes for German art universities). It is built as static HTML with ZFB, and a constrained Composer-based CMS lets editors change content only.

**Status: local Hosted Content dogfooding; not deployed.** Run `pnpm dev:dogfood` and open **http://127.0.0.1:8787/editor/**. Persistent local D1 is `apps/authoring-worker/.wrangler/dogfood/`; normal startup never resets it. Note/FAQ/pricing editing, exact snapshot preview, history, conflict/recovery, Note title/body Content-AI (fake by default; explicit Apply and guarded Undo), and immutable local snapshot builds use the current public Composer API. Publication/delivery remains disabled. [Daily commands, recovery and migration details](docs/dogfooding.md).

## Stack

- **Public site** (`apps/site`): [ZFB](https://github.com/Takazudo/zudo-front-builder) 5.1.5 with zudo-react. It emits static HTML with no JS by default, plus three visitor scripts (`*.client.ts`). It is served as Cloudflare Workers Static Assets (`apps/site/wrangler.jsonc`, no `main`).
- **Styleguide** (`apps/styleguide`): a zudo-sg 0.8.1 host (zudo-doc 9.1.1, zdtp 0.9.0) over `packages/pinsel-ui`. It is for developers only and is never part of the public output.
- **Editor** (`apps/editor`): Vite and Preact. It hosts the Composer content-only editor (`zudo-composer/hosted-content/editor`) and shows the Japanese save and publication states.
- **Authoring Worker** (`apps/authoring-worker`): a private Cloudflare Worker (wrangler 4.149.0). It provides Access JWT checks with jose, D1 drafts, revisions, immutable snapshots and publication jobs, the JSON content API, server-side preview rendering; publication is disabled. It is never deployed from this repository.
- **Shared packages**: `packages/pinsel-ui` holds the zudo-react components, the approved CSS and assets, and the `renderRouteDocument` bridge. `packages/pinsel-content` holds the content models, the editable-field policy, the site structure and the assemble, project and check scripts.
- **Composer**: consumed only through exact git pins of two distinct package-root commits of `Takazudo/zudo-composer` (not a Pinsel or Composer `main` SHA): `zudo-composer` at `git+https://github.com/Takazudo/zudo-composer.git#fba434aaa96af8b4dbc2a086638180f71a2da741` and `@zudo-composer/component-contract` at `git+https://github.com/Takazudo/zudo-composer.git#c0b452da075b66757c60bd0d721a47062d4354d0`. Both are declared by the four importers and resolved once in `pnpm-lock.yaml`. See [`docs/dependencies.md`](docs/dependencies.md#current-state).

## Commands

Requires Node 24.x (`>=24 <25`) and pnpm 11.5.2 through corepack (`corepack enable`).

CI runs these in this order (`.github/workflows/ci.yml`, job `build`). `pnpm build:site` must come before `pnpm check`, because the Worker tests compare their in-workerd render with `apps/site/dist/index.html`.

| Command | What it does |
| --- | --- |
| `pnpm dev:dogfood` | Prepare and run the persistent real local Worker/D1 editor |
| `pnpm build:snapshot -- <file>` | Build immutable snapshot HTML without writing the working draft |
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
| `pnpm verify:publication` | Real local save, snapshot A build, Worker restart and retained draft B in isolated D1 |
| `pnpm test:browser` | Playwright lanes in `tests/browser/` (run through `heavy-guard` locally) |
| `pnpm check:approved-seed` | Hash-check every immutable fixture file against `tests/approved-seed.sha256.json` (CI job `approved-seed`) |
| `pnpm check:content` | The historical strict checker against `apps/site/dist`. CI job `migration-baseline` runs it on every CI run |

More checks, run by the verification passes: `pnpm site:check-fragments`, `pnpm site:wrangler-dev` (public Worker on `wrangler dev`), `pnpm verify:external-install` (Composer git-pin install in a fresh directory), `pnpm gate1:wrangler-dev`, and `node scripts/content/check-publication.mjs --dist apps/site/dist`. CI runs `node scripts/publication/check-public-output.mjs --dist apps/site/dist` in the build job. Content publication is stopped (see [`docs/dogfooding.md`](docs/dogfooding.md)).

Both local verification gates require the frozen install, content assembly, editor build and Worker asset assembly above. They run in every ordinary CI build, without application credentials or a prototype archive. Snapshot build evidence records the current Git HEAD and dirty state. See [local verification](docs/verification/local-gates.md) for bounds, failure controls and sanitized reports.

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
- [Content model](docs/content-model.md), [editing guide (Japanese)](docs/editing.md), [authoring Worker](docs/authoring-worker.md), [styleguide](docs/styleguide.md)
- [Dependencies](docs/dependencies.md) and [`ZUDO_DEPS_PINS.md`](ZUDO_DEPS_PINS.md)
- [Launch inputs](docs/launch-inputs.md): everything still undecided before a launch
- [Verification index](docs/verification/index.md): what each report proves and on which commit
