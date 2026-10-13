# Gate-1 integration proof (zudolab/pinsel#7)

One realistic record — the `course` collection rendered as the home `PricingCards` (3 entries, `price`/`unit`/`homeDescription`/`featured`, `/contact/?course=N` links), inside the `#pricing` section and the global frame template — proven across every surface with production code paths. All proofs ran on this machine (Linux WSL2, Node 24.13.1, pnpm 11.5.2) at the commit recorded below.

- Pinsel: branch `pinsel-site-cms/gate1`, commit `489953dd5afd7a9d7bb72d75a9dd96cf9040c266` (base `base/pinsel-site-cms` @ `9ab6d86`).
- Composer: `zudo-composer@git+https://github.com/Takazudo/zudo-composer.git#7ca114a3ed7dcef10f5420dcc1894ea7125e4da6` (#903 milestone 2, draft PR Takazudo/zudo-composer#904, **no upstream change was needed**), `@zudo-composer/component-contract@…#c0b452da075b66757c60bd0d721a47062d4354d0`.

Superseded since Gate-1 (wave-4 reconcile, `pinsel-site-cms/reconcile-w4`): the pack is `pinsel@0.2.0` and implements the full component contract of `packages/pinsel-content/src/site/component-contract.ts` (every page root is a `pinsel.site-frame@2` with header/main/footer slots; no global template). The canonical project digest is `a56eb8f7408c…` and the plan of all 14 routes is pinned by `tests/golden/routes.snapshot.json` (`pnpm content:check`). The `0.1.0`, `229b6fa5…` and one-route figures below are the Gate-1 record.

## Verdict per leg

| Leg | Verdict | Proof |
| --- | --- | --- |
| Clean external install | pass | `pnpm verify:external-install` |
| SG story | pass | `pnpm sg:check`, `pnpm build:sg` (9 pages, preview CSS carries `.pricing-card`) |
| ZFB no-JS HTML | pass | `pnpm build:site` → `dist/index.html` has 0 `<script>`; Playwright with `javaScriptEnabled: false` |
| Workerd projection parity | pass | `apps/authoring-worker/test/parity.test.ts`: workerd HTML === Node `compileStaticSite` HTML === ZFB `<body>` |
| D1 adapter | pass | upstream `runContentStorageConformance` (12 cases) + losing-CAS and `requestDigest` tests on real local D1 |
| Editor + preview | pass (mechanism) / manager browser check pending | editor built with `contentEditorPlugins()`, served at `/editor/`; preview SSR + protocol client proven by tests and `wrangler dev`; the end-to-end browser edit was not driven by this agent (see "Manager check") |
| Worker behaviours (`wrangler dev --env local`) | pass | `pnpm gate1:wrangler-dev` — 28 steps |
| Boundaries | pass | `pnpm check:boundaries`, `pnpm worker:bundle:check` |

Preview decision: **Worker-side SSR of zudo-react works in workerd**; the client-side fallback (`@takazudo/zfb/zudo-react/client`) is not needed and not built.

## 1. Pin + clean external install

```
corepack pnpm install                       # zudo-composer d99e7909 -> 7ca114a3 in 4 package.json files; tsx 4.23.15 added
corepack pnpm dedupe --check                # clean
corepack pnpm install --frozen-lockfile     # Already up to date
node scripts/verify/external-install.mjs    # temp dir outside the repo
  -> fresh pnpm-lock.yaml records both full commits, no file:/link:/workspace:/path:
  -> --frozen-lockfile reinstall leaves the lockfile byte-identical
  -> imported: zudo-composer/content (22 names), site-build (6), preview-protocol (16), export (3), host-storage (14), authoring (17), @zudo-composer/component-contract (15)
```

## 2–3. Component pack, renderer bridge, content + structure

- `packages/pinsel-ui/src/pack.ts`: `defineComponentPack({ packId: "pinsel", packVersion: "0.1.0" })` with `pinsel.site-frame` (outlet slot `main`), `pinsel.section`, `pinsel.heading`, `pinsel.prose`, `pinsel.pricing-cards` (slot `items`), `pinsel.pricing-card`. `validateRuntimeParity` passes.
- `packages/pinsel-ui/src/render/render-route-document.ts`: `renderRouteDocument(route, pinselRegistry)` walks `composition.document` + `linkedSource` (template outlet verified like the upstream Preact delivery runtime) + materialised collection nodes; props = manifest defaults + node props + `route: { pathname }`; slots become rendered children. `modules[].code` is never read.
- `content/entries/course/{consultation,two-month,four-month}.json`; `packages/pinsel-content/src/site/proof.ts` (`defineSite`: frame template, home page bound to it, `pricing-card` item page + collection mapping sorted by `order`, attachment `home-courses`, sitemap).
- `pnpm content:assemble` → `.site-project/site-project.json` (canonical, digest `229b6fa5…`) + `baseline.json` (`baselineRevision` = `git rev-parse HEAD`); `pnpm content:project` → `apps/site/data/routes.generated.ts` (1 route, `materializationSources` = 3 course entries, `linkedSource.ref.recordId` = `frame`).
- `pnpm --filter @pinsel/ui test` 7/7, `pnpm --filter @pinsel/content test` 76/76 (incl. portable plan === Node release plan with modules stripped).

## 4. ZFB

```
corepack pnpm assets:sync && pnpm content:assemble && pnpm content:project
cd apps/site && corepack pnpm exec zfb check     # checked 0 collections and tsc — no errors
cd apps/site && corepack pnpm exec zfb build     # 1 pages built; dist/index.html + dist/assets/styles-fa56ce55.css
grep -c "<script" apps/site/dist/index.html      # 0
bash heavy-guard.sh -- corepack pnpm test:browser   # tests/browser/gate1-no-js.spec.ts, chromium, javaScriptEnabled:false: 1 passed
  -> 3 article.pricing-card with ¥10,000 / ¥50,000 / ¥92,000, h3 labels, POPULAR, /contact/?course=1..3, 6 header items, 7 footer links, no <script>
```

## 5. SG story

```
corepack pnpm --filter @pinsel/styleguide gen-story-shims && gen-registry && gen-token-manifest
corepack pnpm sg:check          # story shims (2), sg-registry (2 stories), token manifest (43 entries) up to date
bash heavy-guard.sh -- corepack pnpm build:sg   # ✓ 9 pages built in 21.69s; dist/_zudo-sg/preview.css 102493 bytes, contains .pricing-card
```

Stories stay co-located (`packages/pinsel-ui/src/pricing-cards/pricing-cards.stories.tsx`, `site-frame.stories.tsx`) and are mirrored into `apps/styleguide/ui/<name>/<name>.stories.tsx` by `scripts/gen-story-shims.mjs`, because zfb refuses a collection root outside the app.

## 6. Workerd route projection parity (mandatory)

`apps/authoring-worker/test/parity.test.ts` (runs inside workerd via `@cloudflare/vitest-plugin` against local D1): seed → `snapshot()` → `compileSiteProjectPlan(snapshot.project, pinselPack.manifest)` → `renderRouteDocument` → `renderToString` and asserts `toBe(env.NODE_HOME_HTML)` (Node: `compileStaticSite` → same renderer, computed in `vitest.config.ts`) and `toBe(bodyOf(env.ZFB_HOME_HTML))` (the `<body>` inner HTML of `apps/site/dist/index.html`). Both byte-equal. `wrangler dev` renders the same body at `/preview/<snapshotId>/` (step 9).

## 7. Authoring Worker

- `apps/authoring-worker/wrangler.jsonc`: `run_worker_first: true`, `ASSETS`, D1 `DB` (`pinsel-authoring`, placeholder id, `migrations/`), vars `TEAM_DOMAIN` / `POLICY_AUD` / `EDITOR_ALLOWLIST` (empty = fail closed), `compatibility_date 2026-10-12`, `env.local` with `main: src/local-dev.ts`.
- `migrations/0001_init.sql`: `baseline`, `draft_state`, `draft_entries`, `operations` (receipts + idempotency), `revisions`, `snapshots`, `baseline_advances`.
- `src/storage/d1-content-draft-storage.ts`: every write is ONE `db.batch()`; the first statement inserts a token row only while the precondition holds (`… WHERE EXISTS (SELECT 1 FROM draft_state WHERE project_id = ? AND draft_revision = ? AND baseline_revision = ?) AND NOT EXISTS (SELECT 1 FROM operations WHERE operation_id = ?)`), every later statement is `… WHERE EXISTS (SELECT 1 FROM operations WHERE operation_id = ? AND attempt_token = ?)`; the result comes from reading the token row back, never from `meta.changes`.
- `src/auth/identity.ts`: `jose` `createRemoteJWKSet(TEAM_DOMAIN/cdn-cgi/access/certs)` + `jwtVerify` (issuer, audience, exp) + email allowlist; `createFixtureIdentity` only in `src/local-dev.ts`. CSRF: `Origin` must equal the Worker origin (missing → 403), `Sec-Fetch-Site` same-origin when present, JSON body.
- API `/api/v1`: `GET /site`, `GET /draft`, `POST /operations`, `GET /operations/:id`, `PUT /content/:model/:id` (`Idempotency-Key`), `POST /snapshots`, `GET /snapshots/:id`; preview `GET /preview/` and `GET /preview/:snapshotId/<route>?revision=N` rendered with the same `renderRouteDocument` through `@takazudo/zfb/zudo-react/server`.

```
corepack pnpm --filter @pinsel/authoring-worker test     # workerd: 5 files, 29 tests
  storage-conformance.test.ts  upstream runContentStorageConformance 12/12 on D1 + losing CAS leaves 0 operations / 1 seed revision / revision unchanged / no entry change + requestDigest persisted
  api.test.ts                  site description, save+receipt+second session, forbidden/unknown/structure refusals via REST alias + 403 refused paths, stale → conflict + replay, CSRF 403/415, snapshots immutable + preview 200/409/404, identity gate on /editor/ /api /preview /assets
  auth.test.ts                 valid RS256 assertion ok; missing header 401; wrong aud / wrong iss / expired / foreign key / garbage 403 invalid-assertion; non-allowlisted 403; missing config 503
  preview-protocol.test.ts     client messages validated by zudo-composer/preview-protocol readPreviewToHost (ready/rendered/error), navigation on another identity, stale frameLoadId/origin/pack dropped
  parity.test.ts               see §6
corepack pnpm worker:dry-run          # wrangler 4.149.0 --dry-run --outdir .wrangler/dry-run
node scripts/check-worker-bundle.mjs  # 1 file, 690541 chars; no node:/vite/preact/local fixture; carries preview protocol, renderer, Access verification
corepack pnpm worker:types:check      # up to date (wrangler types --strict-vars=false)
```

## 8. Editor

`apps/editor`: `vite.config.ts` (`contentEditorPlugins()`, `base /editor/`, `outDir dist/editor`, `assetsDir static`), `src/main.ts` (`mountContentEditor` with `GET /api/v1/site` → `revision` = baseline, `policy` = `PINSEL_EDITOR_POLICY`, `preview` = `{ url, origin, pack, route }`, `labels: CONTENT_EDITOR_LABELS_JA`), `src/transport.ts` (`ContentEditorStorage` over fetch, like Composer's `fixtures/hosted-content-host/editor/main.mjs`).

```
corepack pnpm build:editor             # vite 8.3.4: dist/editor/index.html + static/index-*.js (859 kB) + static/index-*.css
corepack pnpm assets:assemble-worker   # 136 files (pinsel-ui 133, editor 3) -> served at /editor/ behind the identity gate
```

## 9. Behaviours (`wrangler dev --env local`, local D1 with migrations applied)

`node scripts/gate1/wrangler-dev-proof.mjs --port 8787` — 28/28 steps (report `.reports/gate1-wrangler-dev.json`):

- session A: `GET /api/v1/site` (baseline `9ab6d861…`, pack `pinsel@0.1.0`); draft seeded (`¥50,000`, revision 1); `POST /api/v1/operations` saves `course.price=¥55,000` → revision 2, receipt `gate1-save`.
- `curl`-style refusals with typed codes: `PUT …/course/two-month` with `course-order` → 422 `forbidden` (表示順は並べ替え操作でのみ変更できます), unknown `course-slug` → 422 `unknown-field`, `site-copy` write → 422 `unknown-model`, `GET /composer` → 403, stale `expectedRevision` → 409 `conflict` `draft-revision` (draft preserved at revision 2), missing `Origin` → 403 `csrf-origin`.
- `POST /api/v1/snapshots` → `1ad2dfbc…`; `GET /preview/1ad2dfbc…/?revision=2` → 200, contains `¥55,000` and `<main id="main" tabindex="-1">`, no Preact; `?revision=1` → 409 (never acknowledged as rendered); `GET /editor/` → 200.
- Worker restart, session B (`LOCAL_DEV_SUBJECT=second-editor@example.test`): `GET /api/v1/draft` shows `¥55,000` at revision 2; receipt of session A → 404 for B; snapshot unchanged.
- Production entry, unconfigured: `/api/v1/draft`, `/preview/…`, `/editor/`, `/assets/fonts/fonts.css` → 503 `configuration-required`. Configured (`--var TEAM_DOMAIN/POLICY_AUD/EDITOR_ALLOWLIST`): no assertion → 401 `missing-assertion`, garbage assertion → 403 `invalid-assertion` on all four. Wrong audience / wrong issuer / expired / foreign key → 403 in `auth.test.ts` (local JWKS; the remote JWKS of a real team cannot be reached offline).
- Static build of the saved snapshot: `pnpm --filter @pinsel/content content:project --snapshot .reports/gate1-snapshot.json && (cd apps/site && zfb build)` → `dist/index.html` contains `¥55,000` (1) and no `¥50,000`; rebuilt from the baseline afterwards → `¥50,000`.

## 10. Boundaries

```
node scripts/check-boundaries.mjs     # public dist (4 files): no <script>, no Composer/_zudo-sg/Preact/site-project/provenance; editor bundle: no zudo-react, no node:, has 保存しました + editor chrome
node scripts/check-worker-bundle.mjs  # production Worker bundle: no node: builtins, no vite, no preact, no local identity fixture
```

The preview document contains no Preact (asserted in `api.test.ts` and the `wrangler dev` proof).

## 11. Decision lock

Downstream sub-issues #8–#16 and #19 were edited with the locked file paths, the bridge API, the Worker API contract, the preview mechanism, the snapshot/revision identity scheme and the pin procedure (links in the #7 completion comment). Summary of the decisions:

1. **Preview = Worker-side SSR** (zudo-react `renderToString` in workerd), navigation-based protocol client (`/preview/` shell → `location.replace('/preview/<snapshotId><route>?revision=N')`; `rendered` only for an exact snapshotId + revision + route + frameLoadId match). No client-side render, no Preact in the preview.
2. **Policy = Composer's** (`HostContentPolicy` by field id). `PINSEL_CONTENT_POLICY` (server, lists `order` where `reorder` is allowed) vs `PINSEL_EDITOR_POLICY` (presentation). Pinsel rules in `refusePinselRequest`.
3. **Identity scheme**: `baselineRevision` = Git commit of the content tree at `content:assemble`; `draftRevision` = integer (1 after seed, +1 per apply / advance); `snapshotId` = sha256 of the canonical project; `operationId` = client-minted opaque token; receipts carry `requestDigest` = `hostContentRequestDigest(actor, request, expectedBaselineRevision)`.
4. **Renderer bridge**: `renderRouteDocument(route, registry)`; registry = `pinselRegistry`; `route: { pathname }` injected prop; `DocumentShell` shared by `apps/site/layouts/default.tsx` and the Worker preview.
5. **Derived pipeline**: `content:assemble` → `.site-project/*` + Worker preview styles; `content:project [--snapshot]` → `apps/site/data/routes.generated.ts`; `pnpm build:site` must precede `pnpm check` (CI reordered).
6. **No Composer change**: the milestone-2 SHA is sufficient; PR #904 untouched.

## Manager check (browser, not driven by this agent)

1. `pnpm build:editor && pnpm assets:assemble-worker`, then in `apps/authoring-worker`: `corepack pnpm exec wrangler d1 migrations apply pinsel-authoring --local --env local && corepack pnpm exec wrangler dev --env local`.
2. Open `http://127.0.0.1:8787/editor/` — expected: the restricted Composer editor in Japanese listing only `コース・料金`; edit `価格（表示）` of 2ヶ月コース; status shows 保存しました（改訂 n）; the receipt is visible at `GET /api/v1/operations/<id>`.
3. Click プレビュー → the iframe navigates to `/preview/<snapshotId>/?revision=n` and the editor state becomes `rendered` for that exact identity; the preview shows the new price with the approved CSS.
4. Reload in a new browser context (or restart `wrangler dev`): the value persists; `GET /api/v1/draft` shows it.

## Addendum — final pin (#16)

Re-run at the final identities: `zudo-composer@git+https://github.com/Takazudo/zudo-composer.git#547b532eb56dfecaec1e2bd9060f8d579ad8862c` (milestone 2 + `preview.sandbox`, draft PR Takazudo/zudo-composer#904), `@zudo-composer/component-contract@…#c0b452da075b66757c60bd0d721a47062d4354d0` (unchanged), `@takazudo/zudo-sg@0.5.2`. Decision 6 above no longer holds: one bounded upstream change was made (the editor's preview frame is sandboxed through the mount option instead of a host-side reload). The remaining gaps are listed in `docs/dependencies.md` → "Known Composer gaps".

```
node scripts/verify/external-install.mjs          # fresh lockfile, frozen reinstall, every public subpath import outside the repository: passed
corepack pnpm --filter @pinsel/authoring-worker exec vitest run test/parity.test.ts test/storage-conformance.test.ts
                                                   # in-workerd projection parity 2/2 (byte-identical to Node compileStaticSite; equals the ZFB body), D1 conformance 14/14
corepack pnpm gate1:wrangler-dev                  # 29 steps passed (the structure probe now writes a protected site-copy field and a model outside the policy; every model is policy-listed since the migration)
```

Fresh clone of the branch: `corepack pnpm install --frozen-lockfile` and `pnpm dedupe --check` pass; the installed `zudo-composer` carries `preview.sandbox`.
