# CMS and publication confirm pass (zudolab/pinsel#18)

An independent, adversarial run of the hosted CMS slice on the merged base: the real Worker under `wrangler dev` (workerd and local D1), the real editor in Chromium driven by scripted Playwright, publication only through the fake provider and recorded GitHub fixtures. No real token was used, nothing was sent to GitHub, and no state was reported as `live`.

- Pinsel: branch `pinsel-site-cms/confirm-cms` on base `base/pinsel-site-cms` @ `532bb8d0bca12e5dbbb10a6a23ef4e568eeffce1`. Every run below used the code of `44208b1`. The commit that adds this document changes nothing else.
- Composer: `zudo-composer@git+https://github.com/Takazudo/zudo-composer.git#547b532eb56dfecaec1e2bd9060f8d579ad8862c` and `@zudo-composer/component-contract@…#c0b452da075b66757c60bd0d721a47062d4354d0`. Composer was not changed.
- Machine: Linux WSL2, Node 24.13.1, pnpm 11.5.2, wrangler 4.149.0, Playwright 1.64.0 (Chromium). Heavy steps ran through `heavy-guard`.
- The prerequisites ran before any Worker run: `pnpm assets:sync && pnpm content:assemble && pnpm content:project && pnpm build:site && pnpm build:editor && pnpm assets:assemble-worker`.

## Verdict per check

| # | Check | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Price + FAQ edit persists across a restart and a new context; the preview acknowledges only its exact revision | pass | `cms-confirm.spec.ts` test 1 |
| 2 | Auth on the production entry, local JWKS fixture, `curl` | pass, 58/58 | `scripts/verify/worker-auth-probe.mjs` |
| 3 | Forbidden writes get typed refusals and change nothing | pass, after fix F1 | test 2 (24 probes plus 8 refused paths) |
| 4 | Concurrency, idempotency, aborted requests | pass, after fix F3 | test 3 |
| 5 | Snapshot immutability and its static build | pass | test 4 and the `content:project --snapshot` build |
| 6 | Publication state machine (fake provider) | pass, after fix F2 | test 5 |
| 7 | `content-validate` steps on the edited snapshot | pass | local dry run (below) |
| 8 | Boundaries | pass | dry-run bundle, editor bundle, preview document, `dist/`, lockfile |
| 9 | External install at the final pin | pass | `pnpm verify:external-install` |
| 10 | Edited values in complete generated pages | pass | the dry-run build (below) |
| — | Gate-1 "Manager check" (docs/verification/gate-1.md) | pass | test 1 drives all four steps |

The suites run alongside: `pnpm --filter @pinsel/authoring-worker test` passes 12 files and 100 tests (workerd, local D1). `pnpm --filter @pinsel/editor test` passes 7 files and 31 tests. The full pipeline is under "Regression".

## Fixes made

| | Problem found | Fix |
| --- | --- | --- |
| F1 | `PUT /api/v1/content/course/two-month` with `{ …, values: { "course-price": "¥1" }, path: "apps/site/zfb.config.ts", files: ["package.json"] }` answered **200 and saved the price**. The extra keys were silently ignored. | Every content mutation body (`POST /operations`, the `PUT` / `POST` / `reorder` aliases) and `POST /snapshots` now carries exactly its documented keys. Any other key answers `422 malformed-request` (content routes) or `422 rejected` (snapshots), and nothing is written. Test: `content-api.test.ts` "refuses request bodies with keys beyond the documented ones". |
| F2 | An in-flight job whose provider has no record of it stayed `submitted` forever, even after the stored baseline moved. In the browser run, the Worker restart for the external change reset the in-memory fake. | `observeJob` (`src/publish/jobs.ts`) applies the moved-base rule to a `not-found` answer as well, so the job becomes `conflict`. Timeouts and unavailable answers still never change the state. Test: `publication-scenarios.test.ts` (f2). |
| F3 | After a save request that never reached the Worker, the status line read `保存を確認中 — The save is not confirmed yet.`. Composer's session messages were shown in English. | `apps/editor/src/localize.ts` now carries the session messages and the browser's `Failed to fetch`. `app.tsx` translates `editor.message` in the status line. The in-form banner is localised too. |
| F4 | `docs/publication.md` gave different Japanese labels (送信済み / 確認中 / 確認済み / 反映済み（公開前） / 競合) from the editor and docs/editing.md. | The table now uses the editor's labels (`PUBLICATION_LABELS`). |

Added for this pass:

- `/admin/fake-publisher`, a driver for the fake provider. It is compiled only into `src/local-dev.ts`, and `worker:bundle:check` refuses the route in the production bundle.
- `tests/browser/local-worker.ts`, shared with `editor.spec.ts`.
- `scripts/publication/write-snapshot-files.ts`, which writes the publisher's files for a local `content-validate` run.

## 1. Persistence, preview identity, stale acknowledgements (+ Gate-1 manager check)

```
bash heavy-guard.sh -- flock …/port-8853.lock pnpm exec playwright test tests/browser/cms-confirm.spec.ts   # 5 passed (28.1s)
```

The spec runs `wrangler d1 migrations apply --local --env local` (0001–0003) and then `wrangler dev --env local --var PUBLISHER_PROVIDER:fake --port 8853 --persist-to .wrangler/cms-confirm-state`.

1. In the editor, コースと料金 → コース・料金 → 2ヶ月コース: `価格（表示）` is set to `¥58,000` and the status reads `保存済み（改訂 2）`. The receipt `GET /api/v1/operations/<operationId>` answers 200: actor `local-dev@example.test`, revision 1 → 2, `affectedEntryIds: ["two-month"]`, `requestDigest` present.
2. よくある質問 → FAQ → 「ドイツの美術大学の受験時期はいつ頃ですか？」: `回答` is changed and the status reads `保存済み（改訂 3）`.
3. The Worker is stopped and started again on the same persisted D1. A new browser context shows both values in the form, and `GET /api/v1/draft` returns revision 3 with both values.
4. On the route `/faq/`, プレビュー shows `表示中: 改訂 3`. The iframe is at `/preview/<snapshotId>/faq/?revision=3` and its body contains the new answer.
5. Stale acknowledgements are ignored. The answer is edited again (revision 4) and プレビュー is clicked, with the frame's navigation to `?revision=4` held back by `page.route`. From the still-loaded revision-3 document, four `rendered` messages are posted to the host with `page.evaluate(postMessage)`, carrying the document's real `frameLoadId` from its `ready`: (a) revision 3 of the current snapshot; (b) the revision-2 snapshot; (c) the revision-3 snapshot claiming revision 4; (d) revision 4 with a forged load id. The editor's preview state stayed `pending` for revision 4 and never showed `表示中`. After the navigation was released it showed `表示中: 改訂 4` with the newer answer. The home route's pricing card shows `¥58,000` in the same preview.

Gate-1 manager check, steps 1–4: the commands, `/editor/`, the 保存しました（改訂 n） status (the label is now 保存済み（改訂 n）), the receipt, preview `rendered` for the exact identity with the approved CSS, and persistence across a restart and a new context are all covered by the steps above. The Gate-1 text expects a list of only `コース・料金`. That is outdated: since the content model landed, the editor lists eight groups, and the course model is in コースと料金.

## 2. Auth on the production entry (`curl`, local JWKS fixture)

```
bash heavy-guard.sh -- flock …/port-8854.lock flock …/port-9454.lock node scripts/verify/worker-auth-probe.mjs
# worker-auth-probe: 58/58 passed; report .reports/worker-auth-probe.json
```

The probe runs the production entry `src/index.ts` (not `--env local`) under `wrangler dev`. `TEAM_DOMAIN` is `https://127.0.0.1:9454`, an HTTPS server with a self-signed certificate that workerd trusts through `NODE_EXTRA_CA_CERTS`. That server serves a per-run RSA JWKS at `/cdn-cgi/access/certs`, so the real `createRemoteJWKSet` path is exercised and the fixture counted the fetch. The other launch inputs are `POLICY_AUD=pinsel-authoring-aud-fixture` and `EDITOR_ALLOWLIST=editor@example.test`. Every probe is a `curl` command and is recorded in the report.

| Probe | Result |
| --- | --- |
| No header: `/api/v1/site`, `/api/v1/draft`, `/`, `/editor/`, an editor asset, `/preview/`, `/preview/<id>/`, `/assets/fonts/fonts.css` | 401 `missing-assertion` (JSON for `/api/*`, an HTML page otherwise) |
| `Cf-Access-Authenticated-User-Email` only; another `Host` header (workers.dev style) | 401 |
| Expired; wrong `aud`; wrong `iss`; signed by another key; no `exp`; `nbf` in the future; `alg: none`; garbage | 403 `invalid-assertion` on the API and on the editor (jose codes `ERR_JWT_EXPIRED`, `ERR_JWT_CLAIM_VALIDATION_FAILED`, `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`, `ERR_JOSE_NOT_SUPPORTED`, `ERR_JWS_INVALID`) |
| Valid signature, email not allowlisted | 403 `not-allowed` (API and preview) |
| Valid assertion | 200 on `/api/v1/site`, `/editor/` and the editor asset. A same-origin JSON `PUT` saves, and the receipt names the verified email as the actor. |
| Mutation without `Origin`; with `Origin: https://evil.example`; with `Sec-Fetch-Site: cross-site`; `text/plain`; without an assertion | 403 `csrf-origin`, 403 `csrf-origin`, 403 `csrf-fetch-site`, 415 `unsupported-media-type`, 401. The draft revision and price are unchanged afterwards. |
| `POLICY_AUD` missing: all of the routes above, with and without a valid assertion, plus a mutation | 503 `configuration-required` |
| `TEAM_DOMAIN` over plain `http://` | 503 `configuration-required` |

## 3. Forbidden writes

Test 2. Each probe goes through the REST alias or `POST /api/v1/operations` with a same-origin `Origin`. Afterwards the draft revision and every entry are byte-identical, and no receipt exists for the probes' operation ids.

| Probe | Answer |
| --- | --- |
| `note-slug`; `course-order` outside reorder; `site-copy-brand-word`; `nav-link-href` | 422 `forbidden` (the course order says 表示順は並べ替え操作でのみ変更できます) |
| Structure record as a model (`compositions/about`), mapping record (`mapping-filesystem/about-cv`), unknown model | 422 `forbidden` |
| Structure write via `providerId: "files"` | 422 `wrong-project` |
| Component id as a model (`pinsel.pricing-card`) | 422 `malformed-request` (not a safe record id) |
| Component id as a field (`component`), unknown field `course-slug` | 422 `unknown-field` |
| Markdown with `<script>`, Markdown `<img onerror>` | 422 `invalid-value` (HTML タグは使えません) |
| Markdown `[開く](javascript:alert(1))`, URL field `javascript:alert(1)` | 422 `unsafe-reference` |
| Field id `../../package.json`, entry id `../../../package.json` | 422 `malformed-request` |
| `path` / `files` beside the values; `path` inside the operation request | 422 `malformed-request` (**F1**: was 200 and saved) / 422 |
| Non-string price `{ html: "<b>1</b>" }` | 422 `invalid-value` |
| `create-entry` on the update-only `course` | 422 `forbidden` |
| `POST /publications` with `files`; `POST /baseline/advance` with `gitSha` | 422 `rejected` (`Unexpected field`) |
| `/composer`, `/mapping/…`, `/sitemapper`, `/content/schema`, `/api/v1/{models,schema,upload,assets}` | 403 |

In the form, `表示順` (FAQ) is visible but disabled (`isEditable() === false`). Order only changes through reorder.

## 4. Concurrency, idempotency, aborted requests

Test 3:

- Two concurrent `PUT`s on `course/four-month` with the same `expectedRevision` and different `Idempotency-Key`s: one answers `ok` (revision 5) and the other `409 conflict draft-revision` with `current.draftRevision` 5. The stored value is the winner's.
- Replaying the winner's key with the same request answers 200 `replayed: true`, the same receipt, and no new revision. The same key with a different request answers `409 conflict operation-id`, and nothing is written.
- Two editor contexts on the same revision: the second save shows `競合` and the conflict panel (再適用 / 最新の内容を使う), and the server keeps the first value. Screenshot: `03-conflict.png`.
- A save request aborted before it reaches the Worker (`route.abort`): the status line reads `保存を確認中 — 保存をまだ確認できていません。` and is never 保存済み. The server is still at revision 6 with the old value. The in-form banner offers 保存を再試行 and keeps the edit. Screenshot: `03-request-aborted.png`.
- A request that reaches the Worker but whose answer is dropped (`route.fetch` then `route.abort`): the editor resolves the receipt and shows `保存済み（改訂 7）`, which matches the server (revision 7, `¥98,000`). Screenshot: `03-response-lost.png`.

## 5. Snapshot immutability

- Test 4: the revision-2 snapshot `832ee010…` was captured right after the price save. `GET /api/v1/snapshots/832ee010…` after three later saves is byte-identical to the creation answer. `/preview/832ee010…/faq/?revision=2` renders the original FAQ answer and no Preact, and `/?revision=2` shows `¥58,000`. `?revision=3` answers 409, an unknown snapshot 404, and an unapproved route 404.
- Static build: `pnpm content:project --snapshot <abs>/.reports/cms-confirm/snapshot-revision-2.json && pnpm build:site` gives `¥58,000` in `dist/index.html` (in the 2ヶ月コース `article.pricing-card`), the original answer on `/faq/`, and none of the later answer. On that build `check-publication` reports `course/two-month.price expected "¥50,000", rendered "¥58,000"`. That is correct: it validates against the committed entries, which this snapshot build did not change.

## 6. Publication (fake provider)

Test 5 drives the fake through `/admin/fake-publisher`. Every Pinsel state is decided by the Worker from the fake's observations.

1. **External canonical change.** A snapshot is published (job `submitted`) and an unsent edit is saved (`two-month` `¥61,000`). With the Worker stopped, `content/entries/course/four-month.json` `course-unit` is changed and `PINSEL_BASELINE_REVISION=eeee… pnpm --filter @pinsel/content content:assemble` is run, then the Worker is restarted.
   - `GET /site`: stored baseline `532bb8d…`, canonical `eeee…`.
   - `POST /baseline/reconcile {}` answers `409 baseline-revision` with `conflictId` and `conflicts: []`. Repeating it with `{conflictId, expectedDraftRevision}` answers `rebased`, `kind: merge`.
   - The draft keeps `¥61,000` and the newer FAQ answer, and gains the external `course-unit`, on base `eeee…`.
   - The in-flight job is `conflict` (**F2**). The editor shows `公開状況: 公開内容の競合`.
   - The file and the assembly are restored in `afterAll`.
2. **Publication 1 from the editor**: preview, then 公開を申請, the dialog with the snapshot id, then この内容で申請する.
   - `公開申請済み`. A repeated request for the same snapshot answers `replayed: true`.
   - While publication 1 is in flight, `4ヶ月コース` is set to `¥96,000` in the editor.
   - fake `building` → `ビルド中`; `verified` + green checks → `検証済み`; `integrated` + commit `1111…` → `反映済み`.
   - The stored baseline advances to `1111…`. The draft keeps `¥96,000`, and snapshot 1 does not contain it.
3. **Publication 2** (new context on base `1111…`) contains `¥96,000`, and the fake's submission names base `1111…`.
   - The fake reports `deployed` with commit evidence but no deployment evidence. The Worker reports `integrated`, never `live`, and the page never contains `公開中`.
   - `integrated` + `2222…` → `反映済み`, and the baseline is `2222…`.
4. **Failure, retry, duplicate, timeout.** A scripted refusal answers `failed` (`失敗`, message `Provider refused the submission…`), and the draft and baseline are intact. Requesting the same snapshot again re-arms the same job (`submitted`). A third request answers `replayed: true` without a new submission. A scripted status timeout leaves `submitted`, with `providerFailures: 1` and `Provider timeout (1 in a row)`.
5. **Lost acknowledgement.** The fake records the submission and answers a timeout, so `POST` answers `503 uncertain` with the durable job. `GET` recovers the provider ref by lookup (`fake-0004`). Exactly one `submit` call was made, and the fake has exactly one submission for that snapshot.
6. **Restart.** After a Worker restart the job is read back from D1 (`submitted`) with no new submission. The in-memory fake is empty, so the job says `The provider has no record of this submission.`. Restart recovery against a provider that keeps its state is covered in workerd by `publication.test.ts` ("recovers a lost acknowledgement by lookup, never by a second submission") and the GitHub replay tests.
7. **Publication switched off** (`PUBLISHER_PROVIDER=disabled`): publication 2 answers `configuration-required` with `lastObservedState: integrated`, and the editor shows `公開状況: 設定が必要（最後の状況: 反映済み）`.

The Japanese labels seen in the editor match `PUBLICATION_LABELS` and docs/editing.md: submitted 公開申請済み, building ビルド中, validated 検証済み, integrated 反映済み, failed 失敗, conflict 公開内容の競合, configuration-required 設定が必要. `公開中` was never shown. Screenshots: `05-*.png`.

The recorded GitHub responses (`test/github-provider.test.ts`, `publication-scenarios.test.ts` (i)–(k)) pass in the workerd suite: 100/100.

## 7 + 10. `content-validate` on the edited snapshot, edited values in complete pages

The edited snapshot `b8dbeadb…` is draft revision 4 on base `532bb8d…`, with `two-month` `¥58,000` and the newer `faq-exam-01` answer. The publisher's files were written with `pnpm exec tsx scripts/publication/write-snapshot-files.ts .reports/cms-confirm/snapshot-edited.json`, which uses the Worker's `planPublication` and `serializeEntryFile`. They were committed as one local, never-pushed commit `a2909e9` on a detached HEAD whose only parent is `532bb8d`. The workflow's steps were then run in order:

```
check-snapshot paths --base 532bb8d --head a2909e9   ok: 3 changed path(s) (two entries, content/snapshot.json)
check-snapshot record --head a2909e9                 ok: snapshot b8dbeadb… on base 532bb8d…
pnpm assets:sync / content:validate / content:assemble   ok (246 entries)
check-snapshot digest                                ok: content/entries assemble to snapshot b8dbeadb…
pnpm content:project, zfb check, pnpm build:site     ok (16 pages)
check-publication --dist apps/site/dist              ok: 246 entries against apps/site/dist (14 routes)
check-public-output --dist apps/site/dist            ok: 153 files, no repository-only material
site:check-fragments                                 ok
pnpm content:check                                   ok: plan structure equals tests/golden/routes.snapshot.json (snapshot present)
```

- The entry diff is one line each for price and answer, plus `updatedAt` and `generation`.
- The edited values are in the full pages, with their structure intact:
  - `dist/index.html` and `dist/lessons/index.html` have `¥58,000` inside `<article class="pricing-card">` → `<h3>2ヶ月コース</h3>` → `<p class="price">¥58,000<span>税込</span></p>`.
  - `dist/faq/index.html` has the new answer inside `<details id="category-1-1" open>` with the unchanged question, and the old answer is gone.
- The historical strict checker (`scripts/check-content.sh`) is **not** required here, and it fails on this build as designed: 11 of 14 pages pass, `missingCopy: 3`, the first being the original `/faq/` answer. `tests/fixtures/` is unchanged (`git status` clean, and `git diff 532bb8d a2909e9 -- tests/` is empty).
- Afterwards the branch is checked out again and the derived files are rebuilt from it.

## 8. Boundaries

```
pnpm worker:dry-run && pnpm worker:bundle:check   ok: 1 file, 1666696 chars; no node:/vite/preact/local fixture/seed/fake provider/fake driver route
pnpm worker:check-preview                          ok
pnpm worker:types:check                            up to date
pnpm check:boundaries                              ok: public dist (24 files) allowlisted, three visitor scripts; editor bundle has no zudo-react
pnpm no-deploy:check                               ok
```

- Greps of the dry-run bundle find 0 matches each for `admin/fake-publisher`, `local-dev@example.test`, a `preact` import and a `node:` import.
- The editor bundle `index-*.js` has 0 `zudo-react` and 0 `@takazudo/zfb`.
- Preview documents contain no Preact (test 4 and `api.test.ts`).
- `apps/site/dist` holds no editor, preview, Composer, site-project, snapshot or SG artifacts. It has no `zudo-composer`, `postMessage` or preview-protocol strings, and its only scripts are `assets/client/{art-clock,motion,site}-<hash>.js`.
- `pnpm list zudo-composer @zudo-composer/component-contract -r --json` resolves both, for all four workspace packages, to `https://codeload.github.com/Takazudo/zudo-composer/tar.gz/{547b532e…,c0b452da…}`. The lockfile specifiers are `git+https://github.com/Takazudo/zudo-composer.git#<sha>`. Its only `link:` entries are the workspace's own `@pinsel/*` packages.

## 9. External install

`pnpm verify:external-install` passes: fresh lockfile, frozen reinstall and every public subpath import, in a directory outside the repository, at `547b532e` / `c0b452da`.

## Regression

The full pipeline at `44208b1`, all steps through heavy-guard in the foreground:

PIPELINE_RESULTS

## Remaining gaps

- Restart recovery against the in-memory fake cannot show a provider that keeps its records across a Worker restart. That is covered in workerd with a shared fake and by the GitHub replay tests, as noted in step 6.6.
- No Composer change was needed. The only upstream copy gap is that Composer's session messages are English; Pinsel's host handles them in `localize.ts`, as with the other entries under "Known Composer gaps" in docs/dependencies.md. No Composer #901/#902 flake was reproduced, so neither is cited.
- Live tests (Access, D1, GitHub, Workers Builds) were not performed and are out of scope.
