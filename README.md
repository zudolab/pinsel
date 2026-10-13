# Pinsel

Website for Pinsel (online preparation classes for German art universities). It is built as static HTML with ZFB, and a constrained Composer-based CMS lets editors change content only.

**Status: pre-implementation.** The workspace, pinned toolchain, approved assets, verification fixtures and build-only CI are in place. No page is rendered yet.

## Stack

- **Public site** (`apps/site`): [ZFB](https://github.com/Takazudo/zudo-front-builder) 4.4.0, which emits static, zero-JS-by-default HTML.
- **Styleguide** (`apps/styleguide`): a zudo-sg 0.5.4 host (zudo-doc 6.1.1) over `packages/pinsel-ui`.
- **Editor** (`apps/editor`): Vite and Preact. It hosts the Composer content-only editor.
- **Authoring Worker** (`apps/authoring-worker`): a Cloudflare Worker (wrangler 4.149.0) for Access-gated drafts, preview and publication requests. It is never deployed from this repository.
- **Shared packages**: `packages/pinsel-ui` (components and the approved assets) and `packages/pinsel-content` (content model and projection).
- **Composer**: pinned by git SHA only. See `docs/dependencies.md`.

## Commands

Requires Node 24 (`>=22.13.0`) and pnpm 11.5.2 through corepack (`corepack enable`).

| Command | What it does |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install the pinned workspace |
| `pnpm check` | `assets:verify` + `typecheck` + `test` |
| `pnpm assets:sync` | Copy `packages/pinsel-ui/public/` into `apps/site/public/` (gitignored) |
| `pnpm assets:verify` | Check every approved asset and every copy of it against the approved sha256 manifest |
| `pnpm assets:assemble-worker` | Stage `apps/authoring-worker/dist-assets/`: the ui assets first, then the editor build |
| `pnpm build:site` / `build:sg` / `build:editor` | Build one app |
| `pnpm worker:dry-run` | `wrangler deploy --dry-run` (no upload) |
| `pnpm worker:types` / `worker:types:check` | Generate or check `worker-configuration.d.ts` |
| `pnpm check:content` | Run the strict content-parity checker against `apps/site/dist` |
| `pnpm no-deploy:check` | Fail if any script or workflow could deploy, promote or publish |

## Layout

```
apps/site              ZFB public site
apps/styleguide        zudo-sg developer catalog
apps/editor            Composer content-only editor host
apps/authoring-worker  Cloudflare authoring Worker
packages/pinsel-ui     components, SVG art, approved public assets
packages/pinsel-content content model, structure, projection
content/entries        canonical content records
scripts/               asset, check and guard scripts
docs/                  dependencies, launch inputs
tests/fixtures/        immutable verification fixtures (never shipped)
```
