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

Restore safety: each new run writes an exclusive `run-manifest.json` before browser
mutation. It binds canonical repository path, explicit stage, full package pin,
workspace/schema, renderer and component-pack identities from public capture.
Restore captures current identity and refuses a mismatch before writes. Removal
requests and successful receipts are journaled before proceeding; a missing node
requires its recorded exact removal proof or successful receipt recovery. Content
inverses skip already-restored values and refuse unrelated values. Old artifact
runs without a manifest require manual review; this runner does not infer scope.
Resolved installed package roots, manifest hashes and installed-lock digest are
recorded. These complement required frozen installation; they are not a claim that
lockfile text cryptographically attests every installed byte. The negative mode
now attempts all seven defined endpoint refusals, with public and receipt-inclusive
before/after audits; this expanded run is not yet executed.

### Assistant scenario (not yet executed)

`assistant-ui.mjs` provides actual DOM helpers for selection handoff, fake-provider
proposal, candidate rendering, Apply observation, deliberately lost response,
identical retained-request recovery, and Undo. It does not launch a server, select
credentials, or fabricate candidate acknowledgements. The orchestration
must run only after an immutable T5 package is installed and sources are frozen,
with `PINSEL_ASSISTANT_PROVIDER=fake` explicitly set. No real inference is implied.

For each selected local text field, shared Course price, FAQ answer and Note body:
select its actual rendered owner, choose `Selected property`, use Ask Assistant,
create a conversation and send `replace "OLD" with "NEW"`. For insertion, select
the parent arrangement and send `insert "COMPONENT" into "SLOT" with {"text":"NEW"}`
using the generated grammar's actual allowed component/slot. Assert Apply is
initially disabled; capture unchanged canonical state before Apply. Render the
exact candidate route, verify changed text in its iframe, then Apply. Public
post-Apply capture must show only the named owning domain/field changed; Content
cases must leave Composition, Mapping and Sitemap untouched. Verify shared price
on both Home and Lessons, and FAQ/Note on their actual public routes.

The orchestrator must also exercise stale proposal refusal after a human save,
response loss after a real successful Apply followed by fresh-browser retained
request recovery, and Undo refusal after an intervening save to the same owner.
Use supported inverses and public canonical comparisons for restoration. Capture
before/after each refusal to prove no write. These scenarios are **NOT_RUN** until the installed browser command completes:

```sh
node tests/native-authoring/run.mjs \
  --composer "$ACCEPTANCE_COMPOSER_SHA" --stage notes-v1 --scenario assistant \
  --artifacts /absolute/new-assistant-run
```

Run through the environment's shared heavy guard and child reaper. The runner
sets only `PINSEL_ASSISTANT_PROVIDER=fake`; it does not alter real-provider
credentials. It executes Course, FAQ, Note, local field and local insertion
proposals, with server shutdown and public capture before/after each proposal,
Apply and Undo. The local field case creates a journaled human paragraph fixture
and removes it using the actual Remove component button after Undo. Course Apply
loses a real committed response, closes the browser process and recovers through
the retained product request in the persistent profile. Separate Course cases
exercise stale Apply refusal (`stale-plan`) and guarded Undo (`revision-conflict`) with a human price change;
these use an explicit human inverse after the guard refuses. All refusals have
public capture comparisons.

A failed run retains journals, receipts, browser profiles and snapshots. Resume
supported cleanup with the same scope and `--scenario assistant --restore DIR`.
Unexpected values or unresolved receipts stop cleanup for review. An interrupted
fixture insertion records its exact operation/UUID before dispatch; uncertain
state must be reconciled, never reseeded. Do not treat a prepared script, pure
proof tests, or a successful subset as passing the integrated scenario.

The stale case retains an actual exact-candidate Apply request by aborting its
initial transport before dispatch, then performs a human edit and retries through
Recover retained Apply. Immutable candidate rendering itself is allowed; refusal
is asserted at Apply. The known-refused pending request stays in that case’s
isolated browser profile as evidence; it is not silently discarded.
