# Installed native authoring acceptance

This is the portable promotion of the independently verified T4 browser recipes.
It is **not yet a recorded pass of T5/T6/T7**. The new portable runner, including
its later-B/exact-A extension, still requires an integrated browser run. Earlier
results remain in the [compatibility ledger](composer-compatibility.md) at their
actual source/package identities.

Use Node 24 and pnpm 11.5.2, an immutable Composer Git pin, and a **verified disposable
migration stage containing known data**. Follow the applicable migration recipe
first; the runner never initializes, migrates or reseeds anything. Do not point it
at owner drafts. Keep the original source store/history and stop other editors.
Freeze repository source while the browser runs: source changes legitimately
invalidate reviewed previews. No deployment, external model inference or inquiry
submission is performed.

## Prepare a reproducible checkout

```sh
pnpm install --frozen-lockfile
pnpm dedupe --check
pnpm exec playwright install chromium
node --test tests/native-authoring/proof.test.mjs
```

The runner checks all four consumer manifests and the lockfile for the supplied
40-character Composer SHA. Use the exact installed pin from the ledger; do not use
sibling source, a mutable branch or a copied package. Chromium uses Playwright's
installed browser by default. If needed, set `NATIVE_ACCEPTANCE_CHROMIUM` to an
existing executable, without unsafe-port or browser-security bypass flags.

## Full authoring and exact-snapshot scenario

Use your execution environment's shared heavy-test guard around the following
command. The runner does not hardcode a workstation profile or nest another guard.
Set the actual installed SHA and verified stage name before running:

```sh
export ACCEPTANCE_COMPOSER_SHA='<40-character immutable installed SHA>'
export ACCEPTANCE_STAGE='course-identity-v1'
node tests/native-authoring/run.mjs \
  --composer "$ACCEPTANCE_COMPOSER_SHA" \
  --stage "$ACCEPTANCE_STAGE" \
  --scenario full
```

The stage is passed explicitly to every normal `pnpm dev`, public capture and build
command. It can be a later verified stage supported by the current Pinsel config.
There is no fallback to default authority. An absent stage or invalid pin refuses
before startup. The default loopback port is 4173; use `--port` to change it. An
occupied port refuses rather than attaching to another editor. Readiness uses
bounded direct HTTP, avoiding Node Fetch's unrelated port denylist.

A fresh artifact directory is created under the OS temporary directory and printed
before work. To retain results elsewhere, pass `--artifacts /absolute/new-directory`;
that destination must not exist. Artifacts include beforeimages, public snapshots,
request/receipt projections without auth headers, screenshots, logs and result
JSON. They may contain known staged content. Keep them outside tracked source and
public delivery directories; never commit browser profiles or snapshot blobs.

The full scenario:

1. Loads the Content catalog and checks semantic Consultation selection, structural
   wrappers and shared read-only fields. Verifies old numeric and new canonical
   course query identities and actual Home pricing hrefs, then follows real Home → Lessons and Home → Contact links and reloads query/hash state.
2. Records original course values, inserts a local Paragraph into the advertised
   Lessons `main` slot, records its generated UUID, and types through the real
   schema control. Captures inputValue/screenshot and verifies zero autosave
   requests, then checks explicit Save, rendered text and reload.
3. Changes shared price, label and order through Content UI. Checks Home/Lessons
   price, reordered Contact options and all three numeric/canonical query pairs.
4. Stops the editor and captures reviewed **A** through `authoring:capture`.
   Restarts, explicitly saves different local text **B**, stops, and captures B.
   Builds A through `authoring:build`. Checks A's actual saved owner-qualified node
   and static text, every baseline route plus any additional authored routes, and
   every captured public/managed-asset file's exact bytes/hash/length. A fresh
   public capture must equal B exactly: building A may not overwrite later B.
5. Restarts and checks the stable node. Removes only that test node with the
   supported `document-edit` API using its current qualified target/revision/session;
   restores Content through the UI. This is an **API inverse**, not evidence of a
   human Remove button. Final public capture proves canonical values, references,
   assets and public files restored. Legitimate timestamps/history are retained.

Baseline routes are asserted as a set, so new authored routes are permitted. The
historical exact 14-route proof remains separate; do not weaken historical fixtures
or reinterpret an extra-route test as the baseline gate.

## Rejection and response-loss scenarios

After the full scenario restores state, run these separately under the same guard:

```sh
node tests/native-authoring/run.mjs \
  --composer "$ACCEPTANCE_COMPOSER_SHA" --stage "$ACCEPTANCE_STAGE" \
  --scenario negative \
  --audit-data-root "$PWD/packages/pinsel-content/.native-authoring-$ACCEPTANCE_STAGE"

node tests/native-authoring/run.mjs \
  --composer "$ACCEPTANCE_COMPOSER_SHA" --stage "$ACCEPTANCE_STAGE" \
  --scenario recovery
```

Negatives use actual browser approval/session requests. Shared field shadowing must
return `unsupported-scope`; insertion into an undeclared local slot must return
`component-invalid`. Authentication, missing-session or stale-revision failures do
not count. The before/after public captures and tokens must match. The explicitly
supplied data-root hash audit additionally requires every canonical file and receipt
set unchanged; it is supplemental evidence, never a source for assembling snapshots.

Recovery forwards one real placement mutation, records the successful receipt,
withholds its browser response, closes Chromium, opens a new process with the same
profile, and recovers the exact operation UUID. It then performs the supported
inverse and compares public canonical state. A CDP observer error by itself is
never counted as response-loss acceptance.

## Failures, cleanup and resume

The runner records failures and attempts only guarded supported inverses. It never
raw-restores files or timestamps, clears stores, or reinitializes a stage. A failed
inverse leaves its journal and state for inspection; do not label the run restored.
After reviewing the exact retained state, retry restoration with the same installed
pin/stage and original artifact directory:

```sh
node tests/native-authoring/run.mjs \
  --composer "$ACCEPTANCE_COMPOSER_SHA" --stage "$ACCEPTANCE_STAGE" \
  --restore /absolute/original-artifact-directory
```

This accepts only the recorded inserted owner/UUID and original/test Content values;
unexpected intervening state refuses. Browser shutdown sends graceful TERM to the
owned launcher process group and waits; no forced kill or unrelated-process cleanup.
On execution environments without automatic child reaping, use the environment's
supported child-reaper wrapper around the runner. Preserve an interrupted run's
artifacts and inspect process/lease state before resuming.

The suite runs on POSIX hosts with process-group signals; Windows requires a POSIX
execution environment. Syntax/unit checks alone do not count as a browser pass.
T5 owner-aware AI, T6 new-page/Note workflows and a reviewer following the complete
recipe independently still need their integrated scenarios. Scripted model tests
remain distinct from authenticated-provider acceptance and actual owner cutover.
