# Portable Header and Knowledge reference acceptance

Run this acceptance tooling after the static-page/cold-workspace handoff and immutable package selection. The [2026-11-20 checkpoint](composer-compatibility.md#package-s-installed-acceptance--2026-11-20) records Header label and Knowledge forward/restart/inverse/restart passes at Composer `e802741aaf51bae69b4db67ddc3d80494be61043`. At that pin the href pair stayed **NOT_RUN** ([#65](https://github.com/zudolab/pinsel/issues/65)). The [earlier href cycle](composer-compatibility.md#historical-acceptance-checkpoint--aa8a096--package-62f014f4) and its retained failed forward and read-only recovery belong to Composer `62f014f4ae5acfa10ca551c116be6e3a909310fe`. See the [current ledger](composer-compatibility.md#current-candidate-at-a-glance) for active-pin coverage.

The runner edits one existing published Content owner per phase. It never creates a link, Note, Composition or page; initializes a workspace; publishes; mutates D1; delivers an inquiry; or invokes a model. Header labels and hrefs are separate forward/inverse pairs. Knowledge changes only its qualified Note reference; its title and excerpt stay independent.

Use Node24/pnpm11.5.2 and a frozen install. Select an existing disposable known-data stage explicitly. Stop other writers, freeze a clean committed checkout, and use the environment's shared heavy guard and child-reaper. Do not use owner drafts. All output directories must be new and outside the checkout. An existing output refuses rather than being overwritten.

## Prepare one reviewed intent

Save and stop the editor, then create a fresh public capture:

```sh
PINSEL_AUTHORING_STAGE=notes-v1 corepack pnpm --filter @pinsel/content authoring:capture -- /absolute/new-before.json
```

For the existing About Header label, write a config JSON:

```json
{"kind":"header","field":"nav-link-header-label","currentHref":"/about/","value":"Reviewed About label"}
```

The owner is derived from the actual pinned Header Mapping, identity bindings and Composition placement. Header/Footer href use is shared; Footer's English label, title and description remain independently preserved. The driver refuses ambiguous, transformed or unqualified ownership.

For Knowledge, supply its existing exact qualified owner and an existing published Note destination. Copy IDs from the reviewed public capture; never guess them:

```json
{"kind":"knowledge-reference","field":"knowledge-card-note","ref":{"providerId":"content-filesystem","modelId":"knowledge-card","recordId":"ACTUAL_EXISTING_ID"},"value":{"providerId":"content-filesystem","modelId":"note","recordId":"ACTUAL_PUBLISHED_NOTE_ID"}}
```

The actual Mapping must bind the reference with `route-link`, while title/description remain independently bound. The qualified destination must compile to exactly one dynamic route. Build the before snapshot first for Knowledge or Header href phases:

```sh
PINSEL_AUTHORING_STAGE=notes-v1 corepack pnpm --filter @pinsel/content authoring:build -- /absolute/new-before.json
```

For Header href, use `field: "nav-link-href"`, the current href and the reviewed new static route as `value`. Supply `staticRouteProof` from successful static-page creation/publication/exact-build evidence: `{status:"COMPILED_AND_EXACT_BUILD_VERIFIED",snapshotDigest,route,pageId,title,sectionTitle,pageCopy:{providerId,recordId},buildEvidenceHash}`. The runner checks the public compiler's exact page ID and route, published page-copy metadata, actual build-evidence hash, artifact title and section heading before mutation. A handwritten success flag alone cannot satisfy these checks. This recipe does not create that prerequisite page.

```sh
node tests/native-authoring/header/prepare.mjs /absolute/config.json /absolute/new-before.json /absolute/new-intent.json
```

Inspect the generated owner, exact field/value and before capture. Preparation writes only the exclusive intent file.

## Run one phase

Inside your shared heavy guard/reaper:

```sh
corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/header/run-phase.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage notes-v1 --port 4199 \
  --intent /absolute/new-intent.json --artifacts /absolute/new-attempt
```

All five arguments are mandatory; occupied ports refuse. Runtime provenance records every tracked source-file hash and the installed roots/lock evidence before startup. A new public capture must equal the entire accepted capture. Source changes hold the attempt; normal startup never reseeds.

The browser forwards only the original one exact Content Save. It records and syncs the intended request before dispatch, then its real response and qualified public readback. Published lifecycle, all other fields/records and workspace identities must remain unchanged. A before-read plus after-read is a single-writer rehearsal, not a claim that bare `put-entry` is a cross-domain transaction. Unknown operations, duplicate writes, write/read/journal failures and changed source latch a hold. Composition reads may repair only server-challenged derived JSX through the existing portable family protocol; canonical Composition remains unchanged.

After Save/reload, the actual host iframe verifies Header/Footer or Knowledge copy and href. Navigation enters Browse mode before following the real link. Header href verifies the source Home Header/Footer copy and href before clicking, then checks the destination’s owner-qualified page/route, exact saved preview identity, title and h2. The authored static pilot intentionally contains only a Section: it has no Header/Footer or navigation `aria-current` state to assert. Source navigation remains verified independently; Knowledge checks the Note slug route and h1. No unrelated ancestor link is assumed inactive. Closing drains all observations before and after Chromium closes.

The runner stops its server, captures again, permits only the exact field plus proven generation/token and update time, builds that exact snapshot using Pinsel's production renderer, checks all routes and captured asset bytes, and verifies actual Header/Footer or Knowledge HTML. A further capture must stay identical through build. Only then is exclusive `proof.json` written with `PUBLIC_CAPTURE_VERIFIED`. Logs, original request/readback events, captures, screenshots and profile remain in the attempt directory. No automatic inverse is attempted on failure.

## Explicit inverse and holds

After success, use that proof's `afterCapture` as the next before snapshot. Prepare a new config with the same kind, owner selector (`currentHref` for Header, `ref` for Knowledge) and `forwardProofPath` pointing to the successful forward proof. The preparer derives the inverse field/value; it requires the exact accepted forward-after digest and current complete owner before-image. Use a new intent and artifact directory and the same runtime command. Header href inverse uses the now-current href as its owner selector. Knowledge inverse must still resolve its original published Note. Each inverse has its own public capture/build proof and retains legitimate history/generations; no raw file restore or broad metadata normalization is permitted.

If a response or inverse is uncertain, retain every artifact and stop. Reconcile through supported public readback and the original journal before another write. Do not rerun the original phase or recreate records to make the suite pass. The runner does not implement a generic resume or assume a missing response means no commit. Deployment remains disabled. Authenticated full-CMS Assistant acceptance remains held in #58.

Pure checks (no browser/native writes):

```sh
corepack pnpm exec vitest run --config tests/native-authoring/header/vitest.config.ts
```

`fixture.json` is reduced synthetic baseline material with an invalid capture digest and no usable Assets. It is for tests only, never a workspace import/build input. The root Vitest project includes `tests/native-authoring/header/*.test.mjs`; this wiring is not evidence that current-head CI or installed browser acceptance passed.

## Explicit restart verification before inverse

A successful phase includes reload and offline capture/build, but that alone is not
browser evidence after a server restart. With the server stopped, use the successful
forward or inverse `proof.json` and its exact `afterCapture` to write a new intent:

```json
{"kind":"header-restart","capturePath":"/absolute/phase/after.json","captureDigest":"ACTUAL_AFTER_DIGEST","forwardProofPath":"/absolute/phase/proof.json"}
```

Here `forwardProofPath` means the already accepted phase to inspect (it can also be
an accepted inverse). The runner refuses a changed capture or owner value. Inside
the shared heavy guard/reaper, run:

```sh
corepack pnpm exec node tests/native-authoring/families/run-readonly.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage notes-v1 --port 4199 \
  --intent /absolute/restart-intent.json --artifacts /absolute/new-restart-attempt
```

It starts a new server and browser, admits only observed read operations and the
existing challenged derived JSX repair protocol, and invokes the same Header or
Knowledge rendering/navigation assertions without Save. Host preview responses
must bind the exact accepted capture, workspace, pack and renderer identity. After
shutdown, the complete public capture must remain identical before it writes
`READ_ONLY_RESTART_VERIFIED` proof. Preserve screenshots and the request journal.
Run this after forward and again after inverse when claiming full restart coverage;
it neither reruns a write nor rebuilds the already accepted digest output. Record
each actual restart result against its exact source, install and capture.

Header and Knowledge field runners fence navigation with the shared bounded browser
quiescence and Composition continuation-readiness checks before and after reload,
before rendered-preview navigation, and before visitor links. Initial editing and
write dispatch also require Composition readiness; a pending read is awaited, not
misclassified as a canonical write. Failures and unfinished derived-output
challenges still hold the run. The restart verifier supplies the same navigation
boundary and retains its original-response, busy-read and no-mutation guards.
These source checks are not a new installed runtime acceptance result.

For an acknowledged Knowledge save followed by terminal preview timeout, use the
[read-only saved-reference recovery recipe](native-knowledge-recovery.md). Preserve
the failed run; do not replay the save or fabricate its missing forward proof.

For an acknowledged href save whose responsive link click failed, use the separate
[Header href recovery recipe](native-header-href-recovery.md). It retains the original
FAIL and requires fresh native history, actual navigation and exact-build evidence
before a guarded inverse is eligible. Never rerun the failed forward to repair a click.
