# Architecture

Pinsel has one canonical content source and four outputs: the public static site, the styleguide, the editor and the private authoring Worker with its preview. The public site, the Worker preview and the styleguide render the same zudo-react components from `packages/pinsel-ui`, through one bridge, `renderRouteDocument`. The editor is Preact and renders no Pinsel component itself; it shows the Worker preview in an iframe. Everything described here runs locally. Nothing is deployed (see "What is local-only" below).

## From content to pages

```mermaid
flowchart LR
  E["content/entries/&lt;model&gt;/&lt;id&gt;.json<br/>(Composer ContentEntryRecord, Git authority)"] --> A
  S["structure: defineSite<br/>packages/pinsel-content/src/site/structure.ts"] --> A
  A["pnpm content:assemble<br/>.site-project/site-project.json + baseline.json"] --> C
  C["compileStaticSite (zudo-composer/site-build, Node)"] --> P
  P["pnpm content:project<br/>apps/site/data/routes.generated.ts"] --> Z
  Z["zfb check / zfb build<br/>apps/site/pages + layouts/default.tsx<br/>renderRouteDocument"] --> D
  D["apps/site/dist<br/>14 HTML outputs + assets + 3 visitor scripts"] --> W["public Worker<br/>(Static Assets, 404-page)"]
```

1. **Entries.** `content/entries/<model>/<id>.json` are the canonical records. Their values are keyed by field id. The models, the editable-field policy and the invariants are in `packages/pinsel-content` ([content-model.md](content-model.md)). The site structure (routes, compositions, mappings and collections) is code, `defineSite` in `src/site/structure.ts`. Editors cannot change it.
2. **Assemble.** `pnpm content:assemble` (`src/site/assemble.ts`) combines the entries and the structure into the derived, gitignored `.site-project/site-project.json`. It also writes `baseline.json`, which holds `baselineRevision` (the Git commit, or `$PINSEL_BASELINE_REVISION`) and `projectDigest`. The same command writes the Worker's preview styles (`apps/authoring-worker/src/preview/styles.generated.ts`).
3. **Compile and project.** `pnpm content:project` (`src/site/project.ts`) runs Composer's Node `compileStaticSite`. It writes the resolved route documents as the ZFB data module `apps/site/data/routes.generated.ts` (`ROUTES`, `PROJECT_SOURCE_REVISION`) and the plan as `.site-project/plan.json`. Passing `--snapshot <record>` projects a Worker snapshot instead of the committed entries. The plan is pinned by `tests/golden/routes.snapshot.json` (`pnpm content:check`).
4. **Build.** `zfb build` renders every route through `apps/site/layouts/default.tsx` (`DocumentShell` from pinsel-ui) and `renderRouteDocument`. The result is complete static HTML with no adapter, no islands and no client router. The only scripts are the three visitor entries `apps/site/src/{art-clock,motion,site}.client.ts`, over the behaviours in `packages/pinsel-ui/src/scripts/`.
5. **Serve.** `apps/site/wrangler.jsonc` serves `dist/` as Workers Static Assets with `not_found_handling: "404-page"` and `auto-trailing-slash`, and has no `main`. Locally it runs under `pnpm site:wrangler-dev`.

## The `renderRouteDocument` bridge

`packages/pinsel-ui/src/render/render-route-document.ts`: `renderRouteDocument(route, registry)` walks `build.routes[].composition.document`, together with `linkedSource` and the materialised collections, and renders each node with the component from `pinselRegistry` (`src/pack.ts`, pack `pinsel@0.2.0`). A component's props are the manifest `defaults`, then the node `props`, then the injected `route`. Slots arrive as rendered children. Composer's generated `modules[].code` is never read. Three surfaces use this bridge, unchanged:

| Surface | Where it renders | How |
| --- | --- | --- |
| Public site | Node, `zfb build` | `ROUTES` from `routes.generated.ts` |
| Worker preview | workerd, per request | the saved snapshot, through Composer's portable projection and `@takazudo/zfb/zudo-react/server`. `test/parity.test.ts` proves the output is byte-equal to the Node/ZFB HTML |
| Styleguide | zudo-sg story previews | stories in `packages/pinsel-ui/src/**`, copied as shims into `apps/styleguide/ui/` |

## CSS and the cascade layer order

The approved prototype CSS is split, byte-exact, into `packages/pinsel-ui/styles/tokens.css`, `colors.css` (both plain `:root` custom properties) and `components.css`. `components.css` declares the approved order:

```css
@layer tokens, reset, layout, components, responsive;
```

The `responsive` layer overrides tokens at 70rem, 47.99rem and 23rem, for example `--header-height`, `--gutter`, `--space-section` and `--space-8`. That only works if the token files sit inside `tokens`. Every surface therefore imports them into that layer:

| Surface | File | Token import |
| --- | --- | --- |
| Public site | `apps/site/styles/global.css` | `@import "…tokens.css" layer(tokens)` (and `colors.css`) |
| Worker preview | `apps/authoring-worker/scripts/generate-preview-styles.mjs` → `src/preview/styles.generated.ts` | the inlined token files are wrapped in `@layer tokens { … }` |
| Styleguide preview | `apps/styleguide/src/styles/preview-entry.css` | nested as `pinsel.tokens < pinsel.reset < pinsel.layout < pinsel.components < pinsel.responsive`, so the Pinsel stack keeps its order next to zudo-wind's own `components` layer |

`pnpm check:token-layers` checks the built CSS. `apps/authoring-worker/test/preview-styles.test.ts` checks the generated preview CSS. `tests/browser/token-layers.spec.ts` measures the resolved values on all three surfaces at 1440, 1121, 1119, 769, 767 and 390px.

## Authoring Worker, editor and preview

```mermaid
flowchart LR
  B["Editor (apps/editor)<br/>Preact + Composer content-only editor"] -- "JSON API /api/v1" --> W
  B -- "iframe /preview/" --> PV
  W["Authoring Worker<br/>identity → refused paths → CSRF → API"] --> D1[("D1: drafts, revisions,<br/>snapshots, operations, jobs")]
  PV["/preview/&lt;snapshotId&gt;/&lt;route&gt;?revision=N<br/>SSR via renderRouteDocument"] --> D1
  W -- "publication port" --> G["GitHub provider<br/>content/&lt;snapshotId&gt; branch + PR"]
  G --> CI["content-validate.yml"]
```

- **Worker** (`apps/authoring-worker`, [authoring-worker.md](authoring-worker.md)). `run_worker_first: true` sends every request through the identity gate first, including asset hits. The production entry `src/index.ts` verifies the Access JWT (`cf-access-jwt-assertion`, jose) against `TEAM_DOMAIN`, `POLICY_AUD` and `EDITOR_ALLOWLIST`. When any of them is missing, it answers `503 configuration-required`. Mutations need a same-origin `Origin` and a JSON body. Request bodies must carry exactly their documented keys. The Pinsel host rules (`refusePinselRequest`) run before Composer's `applyHostContentRequest`. Every D1 write is one `db.batch()` gated on its precondition.
- **Identities.** `baselineRevision` is the Git commit of the content tree. `draftRevision` is an integer that grows by 1 per change. `snapshotId` is the sha256 of the canonical project. `operationId` is the idempotency key.
- **Editor** (`apps/editor`). Composer's Preact content-only editor runs with `PINSEL_EDITOR_POLICY`. The host adds Japanese labels (`localize.ts`), groups (`groups.ts`), the save status and the publication status (`PUBLICATION_LABELS` in `publication.ts`). It is built into `/editor/` and staged into the Worker assets by `assets:assemble-worker`. Its bundle contains no zudo-react.
- **Preview.** The editor's iframe loads `/preview/`. That page posts `ready {frameLoadId}`, then navigates to the server-rendered `/preview/<snapshotId><route>?revision=N`. The loaded document reports `rendered` only when the snapshot id, the revision, the route and the frame load id all match. The preview document contains no Preact, and Preact and zudo-react never share a root.
- **Publication** ([publication.md](publication.md)). A publication takes an immutable snapshot id, never file paths. The provider writes only `content/entries/**` and `content/snapshot.json` (`PINSEL_PUBLISH_ALLOWLIST`). It does so as one commit on the recorded base, on branch `content/<snapshotId>`, with a PR into `main`. `content-validate.yml` validates that exact snapshot. The Worker reports `validated`, `integrated` and so on only from provider evidence for the exact head commit. It never reports `live`, because no deployment provider is connected.

## Styleguide

`apps/styleguide` is a zudo-sg host. The stories live next to the components in `packages/pinsel-ui/src/**`. `scripts/gen-story-shims.mjs` copies them into `apps/styleguide/ui/`, and `zudo-sg gen-registry` and `gen-token-manifest` generate the registry and the token manifest. `pnpm sg:check` proves all three are current ([styleguide.md](styleguide.md)). The live token panel exists only here, never in the public output.

## Boundaries

| Boundary | Enforced by |
| --- | --- |
| The public dist has only allowlisted entries and the three visitor scripts. It has no Composer, SG, fixture, provenance, snapshot or editor material | `pnpm check:boundaries`, `scripts/publication/check-public-output.mjs` |
| The Worker production bundle has no `node:*`, Vite or Preact, no local fixture identity, no seed endpoint, no fake provider and no `/admin/fake-publisher` | `pnpm worker:bundle:check` (scans the `--dry-run` bundle) |
| The editor bundle has no zudo-react; the preview has no Preact | `pnpm check:boundaries`, the Worker tests |
| Composer is installed only through the two git SHAs | `pnpm verify:external-install`, the lockfile specifiers |
| Nothing can deploy, promote or publish from scripts or workflows | `pnpm no-deploy:check` |
| The approved seed fixture and the approved assets are byte-exact | `pnpm check:approved-seed`, `pnpm assets:verify` |
| The publisher writes only content paths | `isPublishablePath` (Worker) and `check-snapshot.mjs paths` (CI): the same function |
| The migration checker and the snapshot checker are mutually exclusive, and a skip fails | ci.yml jobs `migration-baseline` / `publication-validate` / `content-gate` |

## What is local-only

- **Identity.** `src/local-dev.ts` (`wrangler dev --env local`) replaces Access with the fixed subject `LOCAL_DEV_SUBJECT`. It adds `POST /admin/seed`, the in-memory fake publication provider and its `/admin/fake-publisher` driver. None of these is in the production bundle.
- **D1.** Only local D1 (`--local`, `--persist-to`) and the workerd test pool are used. `database_id` is a placeholder, and no remote migration has run.
- **Publication.** The default is `PUBLISHER_PROVIDER=disabled`. The GitHub provider is tested only against recorded responses (`test/fixtures/github/`). No token exists, and no request goes to GitHub.
- **Public site.** `wrangler dev` serves it locally. `workers_dev` and `preview_urls` are off, and Workers Builds is not connected.
- **Contact.** The form validates and shows a local success panel. It has no `action` and sends nothing.
- **Indexing.** `apps/site/lib/site-config.ts` sets `indexing: "noindex"`. Every page carries `noindex,nofollow`, and `robots.txt` disallows everything.

The open launch decisions are in [launch-inputs.md](launch-inputs.md).
