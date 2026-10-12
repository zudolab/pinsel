# Authoring Worker

`apps/authoring-worker` is the private Cloudflare Worker behind Access that serves the restricted Composer content editor, the private preview and the JSON content API. It is never deployed from this repository: CI runs only `wrangler deploy --dry-run`. Public delivery is a separate static site (`apps/site`).

## Request pipeline

Every request, static assets included (`run_worker_first: true`), goes through the same order:

1. **Identity** (`src/auth/identity.ts`). The production entry (`src/index.ts`) verifies `Cf-Access-Jwt-Assertion` with jose: `createRemoteJWKSet(TEAM_DOMAIN/cdn-cgi/access/certs)`, `jwtVerify` with `issuer = TEAM_DOMAIN`, `audience = POLICY_AUD`, a required `exp` and `nbf`, then `email ∈ EDITOR_ALLOWLIST`. Missing config fails closed.
2. **Refused authoring surfaces**: `/composer`, `/mapping`, `/sitemapper`, `/content/schema`, `/api/(v1/)?(models|schema|upload|assets)` → 403.
3. **CSRF** for every non-GET/HEAD: `Origin` must equal the Worker origin (a missing `Origin` is rejected), `Sec-Fetch-Site` must be `same-origin` when present, and the body must be `Content-Type: application/json`.
4. API (`/api/v1`), preview (`/preview`), the injected admin route (local entry only), then `ASSETS` with `Cache-Control: private, no-store`.

| Identity outcome | API (`/api/**`) | Navigation / asset |
| --- | --- | --- |
| Missing `TEAM_DOMAIN` / `POLICY_AUD` / `EDITOR_ALLOWLIST`, or a non-https team domain | 503 `{ status: "unauthorized", code: "configuration-required" }` | 503 HTML page |
| No assertion header | 401 `missing-assertion` | 401 HTML page |
| Bad signature, wrong `iss` / `aud`, expired, not yet valid, no `exp` | 403 `invalid-assertion` | 403 HTML page |
| Valid assertion, email not allowlisted | 403 `not-allowed` | 403 HTML page |
| CSRF failure | 403 `csrf-origin` / `csrf-fetch-site`, 415 `unsupported-media-type` | same JSON |

### Local entry

`src/local-dev.ts` (`wrangler dev --env local`) replaces Access with a fixed subject (`LOCAL_DEV_SUBJECT`), compiles in `POST /admin/seed` and registers the in-memory fake publication provider (`--var PUBLISHER_PROVIDER:fake`). The production entry never imports it; `pnpm worker:bundle:check` (`scripts/check-worker-bundle.mjs`) scans the `--dry-run` bundle and fails on the local fixture, the seed endpoint marker or the fake provider marker.

```sh
pnpm build:editor && pnpm assets:assemble-worker
cd apps/authoring-worker
pnpm d1:migrate:local
pnpm dev:local                        # or: wrangler dev --env local --var PUBLISHER_PROVIDER:fake
```

## API (`/api/v1`)

Every body is JSON with a `status` discriminator from the upstream vocabulary. HTTP mirrors it: `ok` 200, `conflict` 409, `refused` / `rejected` 422, `not-found` 404, `unavailable` / `uncertain` 503. Upstream refusal codes (`malformed-request`, `forbidden`, `wrong-project`, `stale`, `unknown-model`, `unknown-field`, `not-found`, `conflict`, `invalid-value`, `unsafe-reference`) and conflict reasons (`draft-revision`, `baseline-revision`, `operation-id`) are used unchanged.

### Site, draft and content

| Route | Body | Result |
| --- | --- | --- |
| `GET /site` | | `{ status, projectId, providerId, baselineRevision, canonicalBaselineRevision, pack, policy, routes, preview: { url, origin, route }, publication, actor }`. `baselineRevision` is the **stored** baseline the editor saves against (it moves with a baseline advance, no redeploy needed); `canonicalBaselineRevision` is the one bundled at `content:assemble`. `publication` is `{ providerId, promotionPolicy }` or `{ state: "configuration-required", message }`. |
| `GET /draft` | | upstream `ContentDraftReadResult<ContentDraftState>` |
| `GET /content` | | permitted models (in the server policy and in the draft), their permitted fields, operations and entries with values narrowed to permitted fields |
| `GET /content/:modelId` · `GET /content/:modelId/:entryId` | | one model / one entry of the above; 404 when not permitted |
| `POST /operations` | `{ operationId, request: ContentMutationRequest, expectedBaselineRevision }` | upstream `HostContentApplyResult`. The editor's save path. |
| `GET /operations/:operationId` | | the receipt, only for its author |
| `PUT /content/:modelId/:entryId` | `Idempotency-Key: <operationId>`; `{ expectedRevision, expectedBaselineRevision, values }` | `put-entry-values` alias |
| `POST /content/:modelId` | `Idempotency-Key`; `{ entryId, expectedRevision, expectedBaselineRevision, values }` | `create-entry` alias |
| `POST /content/:modelId/reorder` | `Idempotency-Key`; `{ entryIds, expectedRevision, expectedBaselineRevision, fieldId? }` | `reorder` alias (`fieldId` defaults to the model's order field) |

Every mutation runs the host rules first (`refusePinselRequest`: note Markdown subset, link targets, school URLs, `order` only through `reorder`), then upstream `applyHostContentRequest`, which calls `authorizeContentMutation` with `PINSEL_CONTENT_POLICY` and the verified actor. Idempotency: the same `operationId` with the same request digest replays the stored receipt (`replayed: true`); the same id with a different request is `409 conflict operation-id`. A stale `expectedRevision` is `409 conflict draft-revision` and writes nothing.

### Snapshots and preview

| Route | Body | Result |
| --- | --- | --- |
| `POST /snapshots` | `{ expectedDraftRevision }` | `ContentDraftMutationResult<ContentSnapshotRecord>`: an immutable capture of the current draft against the current baseline; `snapshotId` = sha256 of the canonical project |
| `GET /snapshots/:snapshotId` | | the record |
| `GET /preview/` | | the protocol shell the editor iframe loads |
| `GET /preview/:snapshotId/<route>?revision=N` | | SSR of the snapshot through `renderRouteDocument` + `@takazudo/zfb/zudo-react/server`, Pinsel CSS inlined; 409 when `revision` ≠ the snapshot's `draftRevision`, 404 for an unknown snapshot or a route the snapshot does not declare (only routes in `PINSEL_ROUTES` are ever considered). Headers: `Cache-Control: no-store`, `Content-Security-Policy: frame-ancestors 'self'`. |

### Publications

| Route | Body | Result |
| --- | --- | --- |
| `POST /publications` | exactly `{ snapshotId, expectedBaselineRevision }` | the job (`PublicationView`). Idempotent per snapshot: a repeat or a second session gets the same job (`replayed: true`). `409 baseline-revision` when the expected base or the snapshot's base is not the stored baseline; `409 package-identity` when the snapshot's component pack is not the one this Worker builds; 503 `configuration-required` (no job) when publication is disabled; 503 `uncertain` when the provider did not answer (the job is durable, `GET` recovers it). |
| `GET /publications/:id` | | the job, refreshed from the provider unless terminal |

`PublicationView`: `{ publicationId, snapshotId, baselineRevision, state, lastObservedState?, providerId, providerRef, evidence, message, attempts, requestedBy, createdAt, updatedAt }`.

| State | Meaning | Required evidence |
| --- | --- | --- |
| `draft-saved` | saved, not requested (no job exists) | |
| `submitted` | the job exists; the provider accepted it or has not answered yet (`providerRef: null`) | |
| `building` | the provider is validating / building, or claims more than its evidence proves | |
| `validated` | upstream `verified` | a commit and every reported check `passed` |
| `integrated` | upstream `integrated` | the integration commit |
| `live` | upstream `deployed` | deployment evidence for the same commit; never produced by a provider in this scope |
| `failed` | the provider refused or the build failed; the draft is untouched | |
| `conflict` | the base moved while the job was in flight, the provider reports another snapshot, or the idempotency key names another submission | |
| `configuration-required` | publication is disabled or misconfigured; `lastObservedState` keeps the last stored state | |

Saving never publishes. A provider is asked to submit only under the job's deterministic idempotency key; after any earlier attempt it is first asked `lookupExisting(snapshotId)`, so a lost acknowledgement or a restart never creates a second submission.

### Baseline

| Route | Body | Result |
| --- | --- | --- |
| `GET /baseline` | | `{ baselineRevision, canonicalBaselineRevision, evidence, openConflicts }` |
| `POST /baseline/advance` | exactly `{ publicationId }` | Re-reads the provider status; requires `integrated` (or `live`) with an integration commit, then `adapter.advanceBaseline({ baseline: { project: snapshot.project, baselineRevision: commit }, expectedBaselineRevision: job base, integratedSnapshotId })` and records `baseline_evidence` (git sha, content digest = snapshot id, package identity, provider evidence). A draft still at the snapshot's revision becomes clean on the new baseline; a newer unsent edit stays the draft on the new baseline. A repeat is a replay. A caller-supplied sha is refused (any field besides `publicationId` → 422). `422 not-integrated` without evidence, `409 baseline-revision` when the stored baseline is not the job's base. |
| `POST /baseline/reconcile` | `{}` or `{ conflictId, expectedDraftRevision, prefer? }` | Compares the stored baseline with the bundled canonical baseline: `in-sync`; `behind` (the bundle is a revision the store already passed); `rebased` with `kind: identity` (same content under a new commit, draft kept), `fast-forward` (no unsent edits) or `merge`. Unsent edits against new canonical content record an open conflict and answer `409 conflict baseline-revision` with `conflict: { conflictId, storedBaselineRevision, canonicalBaselineRevision, draftRevision, conflicts, rebase }`. Repeating with the `conflictId` and the current `expectedDraftRevision` writes the three-way rebase; field / entry / schema conflicts need `prefer: "draft" | "canonical"`. |

## Storage (D1)

`migrations/0001_init.sql` (Gate-1): `baseline`, `draft_state`, `draft_entries`, `operations` (receipts + idempotency), `revisions` (append-only), `snapshots` (immutable), `baseline_advances`. `migrations/0002_publication.sql`: `jobs` (one per snapshot, CAS on `version`), `baseline_evidence`, `baseline_conflicts`, `baseline_advances.kind`.

D1 has no `BEGIN`; the only transaction is `db.batch()`. Every multi-row write is ONE batch whose first statement inserts a token row only while the precondition holds (expected draft and baseline revision, unused operation id), and whose every later statement is gated on that token row. A losing compare-and-set writes no revision, receipt or entry; the outcome is read back from the token row, never from `meta.changes`. The adapter passes the upstream `runContentStorageConformance` suite on real local D1.

## Publication provider port

`src/publish/port.ts` defines `PublicationProviderPort` after the upstream export contract (`zudo-composer/export`): `submit({ submission: ContentExportSubmission, snapshot })` → provider ref, `status(ref)` → state + evidence (commit, PR, build id, checks, deployment), `lookupExisting(snapshotId)`. `selectPublisher` picks a registered factory by `PUBLISHER_PROVIDER`; `disabled` (default), an unknown name, an invalid `PROMOTION_POLICY` or missing provider inputs all answer `configuration-required`. The production entry registers no provider yet; the GitHub provider and the reconciliation loop (`src/publish/github-provider.ts`, `src/publish/reconcile.ts`) belong to the publication sub-issue. `src/publish/fake-provider.ts` is the deterministic fake with scriptable timeouts, lost acknowledgements, refusals and duplicates (tests and the local entry only).

A provider writes only `content/entries/**` and `content/snapshot.json` (`PINSEL_PUBLISH_ALLOWLIST` / `isPublishablePath` from `@pinsel/content`, the single authoritative list).

## Configuration and launch inputs

| Key | Default | Meaning |
| --- | --- | --- |
| `TEAM_DOMAIN` | empty | `https://<team>.cloudflareaccess.com`; issuer and JWKS host |
| `POLICY_AUD` | empty | Access application AUD tag |
| `EDITOR_ALLOWLIST` | empty | comma-separated editor emails |
| `PUBLISHER_PROVIDER` | `disabled` | publication provider name |
| `PROMOTION_POLICY` | `manual` | `manual` or `auto` |
| `DB` | placeholder id | D1 `pinsel-authoring`, `migrations_dir: migrations` |
| `ASSETS` | `dist-assets/` | written only by `scripts/assets/assemble-worker.mjs` |

No secrets are in the repository; `apps/authoring-worker/.dev.vars.example` lists the local keys. Launch inputs still open (see `docs/launch-inputs.md`): the authoring hostname and Access application (team domain, AUD, allowlist, One-time PIN), the D1 database id, publisher credentials, the promotion policy and the Cloudflare build connection. None is configured, and no live test was performed.

## Absent by design

- No executable MDX / JSX / raw HTML is accepted anywhere: text fields are values, Markdown is the safe subset, and the preview never reads `modules[].code`.
- No arbitrary file-patch endpoint and no path input: publication takes a snapshot id, the provider derives the allowlisted paths.
- No shell / command endpoint.
- No schema, model, mapping, route or component editing (refused paths above, policy by field id).
- No uploads, R2, queues or multitenancy: one site, the approved committed asset catalog.

## Commands

```sh
pnpm --filter @pinsel/authoring-worker test         # workerd + real local D1 (needs pnpm content:assemble and pnpm build:site)
pnpm --filter @pinsel/authoring-worker typecheck
pnpm worker:dry-run && pnpm worker:bundle:check
pnpm worker:types:check
pnpm no-deploy:check
```
