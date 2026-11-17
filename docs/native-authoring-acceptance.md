# Installed native authoring acceptance

This is the portable promotion of the independently verified T4 browser recipes.
It is **not yet a recorded pass of T5/T6/T7**. The new portable runner, including
its later-B/exact-A extension, still requires an integrated browser run. Earlier
results remain in the [compatibility ledger](composer-compatibility.md) at their
actual source/package identities.

Use Node 24 and pnpm 11.5.2, an immutable Composer Git pin, and a **verified disposable
stage containing known data**. Use the fresh-checkout bootstrap below, or follow
the applicable migration recipe for an existing saved workspace first; the runner never initializes, migrates or reseeds anything. Do not point it
at owner drafts. Keep the original source store/history and stop other editors.
Review a fresh public capture against the accepted predecessor digest before each
run. Restored runs retain legitimate timestamps, generations and history; use their
verified restored capture as the next predecessor, not the original digest.
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

## Fresh known-data bootstrap or existing saved workspace

Run the preparation commands above from the Pinsel repository root. For a fresh,
separate disposable checkout with no native state, the current public initializer
can create `notes-v1` directly. It reads committed `content/entries`, builds the
known structure, and normalizes Note routes for pack `0.4.0` / renderer `native-v3`.
It does not require reconstructing an older pack or running the two migrations.
Fresh bootstrap passed in the independent cold-operator run at Pinsel
`b4b83c301ae72f56e8e59b31ae5ed68e9e74fb71` / Composer
`960f2d5661b0d23006fbdfa7d079a7f3683f8362`: frozen install, seed/assets checks,
initialization, saved Paragraph, capture/build and supported removal. This is
known-data evidence at those identities, not owner-data migration or a pass of the
whole portable suite. See the [compatibility ledger](composer-compatibility.md).

Before initialization, verify that all three paths are absent:

- `packages/pinsel-content/.native-authoring-notes-v1`
- `packages/pinsel-content/.native-public-notes-v1`
- `packages/pinsel-content/.native-import-evidence.json`

If any exists, preserve it and inspect its evidence; use another fresh checkout
for a new rehearsal. The initializer checks all three destinations before public-file preparation or
import and refuses existing files, directories and dangling symlinks. This preflight
is not an atomic reservation: keep other writers stopped. Cross-store initialization
is staged, and the shared import-evidence filename is written last. Preserve any
partial output after a later failure; do not retry over it.

```sh
pnpm check:approved-seed
pnpm assets:verify
PINSEL_AUTHORING_STAGE=notes-v1 pnpm --filter @pinsel/content authoring:init
```

Approved assets must already exist at `packages/pinsel-ui/public` and
`packages/pinsel-ui/src/art`; the checks above verify them. Initialization copies
the committed public assets, combines `packages/pinsel-ui/styles/{tokens,colors,components}.css`,
and prepares visitor scripts from `packages/pinsel-ui/src/scripts` into the named
native public directory. No site build, Worker assembly, remote storage or asset
upload is a prerequisite. Retain the resulting stage and import evidence; verify
`ownerData: false`, source `committed-content-and-structure`, and ready status.

For existing saved native state, use the [course migration](composer-course-migration.md)
and [Note migration](composer-note-migration.md), then the
[canonical shared-source migration](canonical-shared-sources.md) as applicable instead.
A verified stage that already completed these migrations must not be initialized or
migrated again. Keep the
matching source runtime and recovery history. Never substitute fresh initialization
for migration of saved edits. In the current checkout, use `notes-v1` consistently
for authoring, capture, build and the runner; `course-identity-v1` is the older
pack `0.3.0` / renderer `native-v2` migration source.

## Independent manual saved-Paragraph recipe

The Paragraph edit/build/restoration passed at package `960f2d5`, using a disclosed
Page-selector workaround for the then-broken Sitemap handoff. The revised handoff
below passed independently at Pinsel `81affe70ccaba458656b827a09b8b530be41ae4a` /
Composer `1af202393e9d1510aee87f17dbc09ea49d59ea44`, with exact before/after
public capture equality. That navigation-only retest does not relabel the earlier
mutation pass or prove the whole revised recipe at the newer pin. Receipt-body
recovery, per-asset hashes and later-B/exact-A remain separate acceptance.

Use the verified disposable `notes-v1` stage, with other writers stopped and source
frozen. Record the Pinsel commit and immutable Composer/contract pins. Create an
external evidence directory and capture the before state while the editor is stopped:

```sh
export ACCEPTANCE_STAGE=notes-v1
export EVIDENCE_DIR="$(mktemp -d /tmp/pinsel-manual-acceptance.XXXXXX)"
PINSEL_AUTHORING_STAGE="$ACCEPTANCE_STAGE" pnpm --filter @pinsel/content authoring:capture -- "$EVIDENCE_DIR/before.json"
PINSEL_AUTHORING_STAGE="$ACCEPTANCE_STAGE" pnpm dev
```

1. Open the printed loopback URL at `/composer?native=1`. In the sidebar choose
   **Sitemaps**, open **Main**, then select **オンラインクラス - Pinsel** (`/lessons`).
   In its inspector choose **Open page authoring**. This qualified handoff selects
   the saved Lessons route; the Source tab's **Open in Composer** opens the source
   Composition instead.
   Wait for **Saved snapshot rendered**. In the component tree,
   enable **Show structural wrappers** if needed and select the page frame.
   Expand **Component and owner** and verify `files/lessons/frame`.
2. Under **Insert local component**, choose slot `main` and component Paragraph
   (`pinsel.paragraph`), then **Insert at start of slot**. This insertion is a
   canonical save. Select the inserted Paragraph in the tree, expand **Component
   and owner**, and record its new UUID and full `files/lessons/<UUID>` owner.
   Record the insertion response/receipt and a screenshot; do not create another
   node if the response is uncertain.
3. In the inspector's **本文** field, type `Independent saved Paragraph proof A`.
   Before saving, confirm the input retains this text while preview still shows
   saved content. Click **Save field**, wait for **Saved snapshot rendered**, and
   confirm the text appears. Reload and reselect the same UUID; confirm the saved
   field and rendered text. Record screenshots and the actual save result.
4. Stop the owned server gracefully. Capture and build using the same explicit
   stage, under the execution environment's shared heavy-test guard where required:

   ```sh
   PINSEL_AUTHORING_STAGE="$ACCEPTANCE_STAGE" pnpm --filter @pinsel/content authoring:capture -- "$EVIDENCE_DIR/saved-a.json"
   PINSEL_AUTHORING_STAGE="$ACCEPTANCE_STAGE" pnpm --filter @pinsel/content authoring:build -- "$EVIDENCE_DIR/saved-a.json"
   ```

   Record the printed snapshot digest and output path. Verify `build-evidence.json`
   names that exact digest and the expected workspace/pack/renderer, the emitted
   `lessons/index.html` contains the exact marker, and the captured Lessons document
   contains it on the recorded UUID. Baseline routes must remain present. Do not use
   `build:site` as a substitute for this reviewed capture build.
5. Restart with `PINSEL_AUTHORING_STAGE="$ACCEPTANCE_STAGE" pnpm dev`. Confirm the
   same owner, text and preview survived restart. Select only the journaled
   Paragraph and use **Remove component**. After successful save, stop the server
   and capture to a new `$EVIDENCE_DIR/restored.json`. Compare the public canonical
   documents and Content values with before; report legitimate history/timestamp
   differences rather than erasing them. Keep receipts, captures and screenshots.
   An uncertain save or inverse is a recovery hold, never permission to reset data.

This manual exercise proves one representative local edit only. Run the full,
negative, recovery and Assistant scenarios separately for their wider claims,
including exact A after later B and byte-for-byte captured asset verification.

## Full authoring and exact-snapshot scenario

Use your execution environment's shared heavy-test guard around the following
command. The runner does not hardcode a workstation profile or nest another guard.
Set the actual installed SHA and verified stage name before running:

```sh
export ACCEPTANCE_COMPOSER_SHA='<40-character immutable installed SHA>'
export ACCEPTANCE_STAGE='notes-v1'
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
5. Restarts and checks the stable node. Removes only that test node using the
   actual **Remove component** button with its current qualified target, then
   restores Content through the UI. Final public capture proves canonical values, references,
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
profile, and recovers the exact operation UUID. The recovered browser request and receipt must exactly match the retained request.
The runner then stops the editor, captures current public state, and starts a
separate recovery phase. Only that verified revision may perform the supported
inverse; the final public capture must match the original canonical state. A CDP observer error by itself is
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
  --scenario "$ORIGINAL_SCENARIO" \
  --restore /absolute/original-artifact-directory
```

Set `ORIGINAL_SCENARIO` to the original manifest's `full`, `inspect`, `negative`,
`recovery` or `assistant` value; scope and scenario mismatches refuse before cleanup.
Recovery resume uses `recovery-journal.json`, not the full scenario's insertion
beforeimages. It checks the public current capture against the original capture,
allowing only the exact recorded parent-slot swap and that owner's update time.
Forward and inverse requests are journaled before dispatch. An inverse is bound
to the exact public current capture; a newer preview refuses before dispatch. A known successful
receipt is replayed only with the identical request. Without a successful receipt,
resume requires its revision to differ from the current public snapshot: the
request may recover an existing receipt but cannot newly commit. An uncertain
request still matching the current revision is held for reconciliation. Missing
receipts, unrelated changes and legacy runs without this journal remain held;
never recreate the mutation or reset the workspace. Restored order alone does not
prove recovery: the runner requires both exact forward and inverse receipts.
The original failed result is retained when a later resume succeeds. Resume results
carry `restorationOnly: true`; successful cleanup does not turn a failed scenario
into passing acceptance. For `negative` resume, also pass
`--audit-data-root "$PWD/packages/pinsel-content/.native-authoring-$ACCEPTANCE_STAGE"`
as required by the original receipt-inclusive audit.

For the full scenario, this accepts only the recorded inserted owner/UUID and original/test Content values;
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

### Assistant scenario (partial evidence; full run failed)

The complete seven-case workload can exceed a guard's default 1800-second
runtime cap. Use its supported bounded `--max-run 5400` option for this aggregate,
retaining serialization, memory checks and all operation timeouts. An interrupted
run requires journal/receipt reconciliation and supported restoration before retry;
it is never a pass. See the latest compatibility ledger for attributed subsets.

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
before/after each refusal to prove no write. The installed `1af2023` run completed fake-provider Course and FAQ proposal,
Apply and Undo, including Course retained-request recovery, then failed before a
Note proposal with `No rendered bound target for note-body`. The aggregate result
remains **FAIL**; local field/insertion, stale Apply and guarded-Undo scenarios
are not completed by that subset. See the ledger for identities and evidence.
The complete installed command remains required:

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
public capture comparisons. The stale lifecycle stays on one dev server: candidate
acknowledgements are process-local, so restarting between review and attempted
Apply would test an unrelated approval mismatch. The runner compares coherent
native-preview identities around the refusal, records actual public Content reads
for both human Saves, then checks all domains in the final offline capture.

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

### Host preview navigation

**Saved host page preview** opens the production-rendered saved workspace. Sitemap
page handoffs validate the active provider, Sitemap, page and concrete route; stale
or mismatched handoffs refuse. A page family with multiple routes requires choosing
a concrete route in Page authoring rather than guessing a Content entry.

The generic activated-release visitor viewer is explicitly unavailable for this
host. It must not display the current workspace as if it were that immutable release.
Use the exact captured Pinsel static build for output verification; local release
compilation/activation alone is not rendered-output evidence.

### Content generation proof

The installed native transactional store (`stampGenerations`) assigns a changed
entry the **new global Content token**, not its previous entry generation plus
one. Assistant Apply asserts one global-token increment, the exact qualified
provider/model/entry generation, and its committed receipt token/owner. It then
compares every other authored value, entry generation, domain and asset strictly.
Restoration accepts only explicit qualified-owner generation transitions derived
from successful receipts or journaled successful UI saves with a preceding public
capture. The run writes their exact before/after metadata audit. Authored fields
named `generation` remain strict.

The initial Course run on package `1af2023` passed UI Apply/recovery and Undo but
was reported FAIL because the older assertion treated generation metadata as an
unexpected authored change. Its evidence remains unchanged.

The `full` runner now records each actual human `put-entry` Save acknowledgement
and supplemental public Content reads immediately before and after it. The Save
response itself returns no generation; the read-back supplies the committed token
and qualified entry generation. These reads are operation evidence, never a
substitute for coherent `authoring:capture` snapshots or build inputs. Capability
and session headers are reused in memory and are not written to the journal.

Content observers let Chromium send the original admitted request and inspect that
same request's response. They do not replay mutations through `route.fetch()`.
Supplemental reads use same-origin browser fetches with observed session headers;
Chromium supplies Origin and Fetch Metadata, and reads reject redirects. A redirected
original write refuses proof and requires reconciliation. The editor may receive
its acknowledgement before the journal finishes; the harness returns only after
response/read-back evidence is persisted. An uncertain outcome retains the write
fence. A standalone strict-origin browser fixture covers the old replay rejection
and the original-request transport without accessing authoring stores.

Each changed Save must advance the global token once and change only its intended
Course field. The final restoration checks the exact original→test→original field
transitions, every verified request/read/response record, and the final global token.
Only the proven qualified owner generation is allowed to differ. Unchanged controls
send no mutation and authorize no metadata difference. Extra UI write requests are
refused. An uncertain attempt prevents automatic restoration, including component
removal; retain its evidence and reconcile it before further writes. A concurrent
write can invalidate this proof: the supplemental reads do not form a transaction.

The new full-scenario proof has focused test coverage but **has not yet passed an
installed full browser run**. Keep that acceptance held until the actual command
completes, including exact snapshot A/build and restoration checks. Older full-run
journals without successful per-save evidence cannot authorize generation changes.

Assistant response observation journals the successful receipt before waiting for
UI completion. A normal Apply (or recovered lost Apply) must show `Status: applied`
and an enabled Undo control before the harness navigates away; Undo must show
`Status: undone`. These waits are bounded and do not replay operations. The
intentionally lost initial response is handled by fresh-browser recovery first.
Run `assistant-ui-settlement.test.mjs` separately under the heavy guard: its small
browser fixture verifies that an open review or disabled Undo does not count as
settled. It starts no authoring server and touches no canonical workspace.
