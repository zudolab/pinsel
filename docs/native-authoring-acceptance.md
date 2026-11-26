# Installed native authoring acceptance

This portable runner has recorded installed acceptance at Pinsel
`b434c8fefd4c9659a9306c4e8481ae3262b46385` with Composer
`5fe6d8d92f5013943053491794c0502b83228d53`: full human authoring PASS969s
(including later-B/exact-A build), seven semantic refusals PASS256s, controlled
interruption/recovery PASS270s, and the complete seven-case fake-provider Assistant
run PASS3455s. These are historical, pin-qualified results—not completion of all
T5/T6/T7 requirements or authenticated inference.

See the [compatibility ledger](composer-compatibility.md#current-candidate-at-a-glance)
for the current immutable pin and its recorded coverage. Historically, with Composer
`c5ffd410f74ba4b3aa003da068efeeae6e663c37` at Pinsel
`66865aeb1dab917057b1186c2a584855a662b19c`, full human acceptance passed1001s,
seven semantic refusals passed277s, retained authored-static-page restart/build
passed173s and its production visitor passed57s. The Results consumer at
`25e49398e94728a7be2c062972b5fecbdc384c87` passed phases13/14 after the distinct
phase12 recovery and sealed second installation transition. See the
[historical c5 checkpoint](composer-compatibility.md#historical-c5-installed-checkpoint--2026-11-17)
for original failures and recovery qualifications. The later
[2026-11-20 checkpoint](composer-compatibility.md#package-s-installed-acceptance--2026-11-20)
records its own fresh-stage recovery, fake-provider Assistant and Results/FAQ passes
at Composer `e802741aaf51bae69b4db67ddc3d80494be61043`.

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


## Route and owner evidence coverage

This matrix distinguishes rendered output from actual authoring selection. Evidence
paths below are relative to `/workspace/composer-adoption-notes/`; they identify
retained Cloud artifacts, not files shipped with this repository. The four complete
5fe runs have `operator-summary.json` under `t7-5fe6-full-1`,
`t7-5fe6-negative-1`, `t7-5fe6-controlled-recovery-1` and
`t7-5fe6-assistant-1`. The full run builds all 14 baseline routes with 143 public
files and proves the older snapshot remains exact after a newer edit. The c5
`t7-c5-full-1` and `t7-c5-negative-1` independently repeat those scopes. The aa8
`route-matrix-aa8-evidence.json` separately verifies one qualified owner on each
of Home, About, Voices, Notes, Contact and404; those are aa8 selection results,
not new c5 browser runs or proof for every component.

| Route / owner scope | Recorded evidence | Selection or follow-up boundary |
| --- | --- | --- |
| Home | Full run renders shared Course changes on Home and Lessons; independent Header label cycle has forward/inverse/restart/build proofs under `docs-operator-0180/header-*`. | This does not establish selection of every Home component. Header href remains its separate recipe. |
| Lessons / Consultation | Full run's `inspect-*` evidence matches rendered target, semantic tree and Inspector owner; local edits/insertion, shared Course values, reload/restart and restoration pass. | Parent arrangement and Content ownership have distinct proofs; no blanket permission to edit mapped values locally. |
| About | Baseline build/visitor coverage; static phases13–15 reparent the new page under About and update/publish its metadata. The aa8 owner matrix selects the existing About breadcrumb. | Child reparenting and existing-page selection are separate proofs. |
| Results | `docs-operator-0180/results-family/00-0014ca2` through `10` cover existing family preparation; phase11's separately recovered Mapping proof passed394s at `11-recovery-ca600a1/recovery-sequence-proof.json`; phase12 has its distinct saved-binding recovery, followed by c5 phases13/14 and history15. | Original phase11 failures remain failures. Completed placed-family selection/render/order/static proof is still pending the family sequence. |
| Voices | Baseline exact build/static visitor; aa8 owner matrix verifies the page breadcrumb across preview, tree and Inspector. | One owner is verified; this does not establish every Voices component or a new c5 selection run. |
| FAQ | Complete Assistant run selects detailed `faq-item/faq-exam-01` on `/faq/`, reviews the exact candidate, applies and undoes. | New-group/child membership and ordered-family acceptance remain separate. |
| Notes / detail | Baseline index/detail rendering; complete Assistant run selects `note/exam-schedule` body on its detail route and applies/undoes. | This does not establish every index/detail component's selection. New Note publication evidence retains its separately recorded pin. |
| Contact | Full run verifies shared option labels, stable Course links and query behavior. | Visitor behavior does not prove selection of every Contact-owned component. |
| 404 | `/404.html` is included in baseline build/visitor evidence; the aa8 matrix verifies `not-found-block/block` selection. | One owner is verified; the matrix remains pin-qualified to aa8. |
| Authored static page | Accepted phase01–15 chain under `t6-static-sequence-1/`, including separately recovered proofs where original attempts failed; actual create/Section/title/source/metadata/navigation/reparent/publication operations. | Phase09's exact build and `static09-production-visitor-1/proof.json` cover16routes/143assets. Final phase15 and subsequent retained installation runs have separate proofs. Historical c5 `static15-retained-c5-1` / `static15-production-visitor-c5-1` verify16routes/143assets after the explicit closed Header-cycle transition; the earlier snapshot cannot stand in for that proof. |

The static chain's final accepted phase15 capture is
`3777470221d254f0dea6134a30c4515e4647c2d1932542674359d85ef8fe22ab`.
Use `static-resume-checkpoint-20261117.json` and the ledger to locate each actual
accepted predecessor, including recovery artifacts; do not assume every original
numbered directory passed. The Results operator's machine-readable
`docs-operator-0180/operator-checkpoint.json` records Mapping recovery PASS394s;
older prose describing it as queued does not override that proof.

**Detached copy versus live shared reference remains an explicit Results acceptance
assertion.** Verify that duplicated local Composition nodes have independent
identities while preserved Content references still resolve to their original
qualified owners; do not infer Content detachment from a successful Composition
duplicate. Reuse the existing family duplication and follow-up evidence rather
than introduce new Pattern/Global-template scope. These coverage boundaries are
not claims that unsupported ownership edits should be enabled.

## Prepare a reproducible checkout

```sh
pnpm install --frozen-lockfile
pnpm dedupe --check
pnpm exec playwright install chromium
node --test tests/native-authoring/proof.test.mjs
```

The runner checks both active consumer manifests (`packages/pinsel-content` and
`packages/pinsel-ui`) and the lockfile for the supplied
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
6. Post-removal proof (#978), only after step 5 succeeded with an original removal
   receipt: capture, then a separate `removed-absence` browser process (fresh
   server and profile) opens `/lessons/`, reloads, and requires the removed node
   absent from preview targets and its saved texts absent from the rendered page.
   A second capture must equal the first. The runner builds that capture with
   `authoring:build` (an existing digest output is reused, never rebuilt), runs
   `verify-removal-build.mjs` under tsx for the exact build plus HTML absence on
   every route into `removal-build-proof.json`, and a post-build capture must be
   unchanged. A failure here is reported without undoing the retained removal.

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
`component-invalid`. Invalid removal (#978) is checked twice. In the UI, the
installed inspector always renders **Remove component**; for the shared Mapping
section `lessons-consultation/section` and for the captured local root of `lessons`
(`frame`) the button must be disabled and show the target's own refusal reason
(the Mapping-shared message, and `Root components cannot be removed here.`).
Then forged `remove` requests for both targets must return `unsupported-scope`.
This workspace has no linked or global-template Composition on a page, so the
global-sourced refusal reason is accepted by the validator but not exercised. Authentication, missing-session or stale-revision failures do
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
receipt is validated against the exact original request and before/after images.
Cleanup does not replay that request through an API client. A known successful
forward receipt and exact moved public capture authorize the actual approved
“Move page placement down” UI action. An existing inverse requires its exact
successful receipt and an already restored current capture. Missing or uncertain
receipts hold all cleanup for separate reconciliation; stale requests alone do
not authorize replay. New UI response status and raw body are durably journaled
before assertions. Restored order alone does not prove recovery: both exact receipts
remain required. Original failed results stay retained; successful resume is labeled
`restorationOnly: true` and never changes a failed scenario into a pass.

For the full scenario, this accepts only the recorded inserted owner/UUID and original/test Content values;
unexpected intervening state refuses. Browser shutdown sends graceful TERM to the
owned launcher process group and waits; no forced kill or unrelated-process cleanup.
On execution environments without automatic child reaping, use the environment's
supported child-reaper wrapper around the runner. Preserve an interrupted run's
artifacts and inspect process/lease state before resuming.

The suite runs on POSIX hosts with process-group signals; Windows requires a POSIX
execution environment. Syntax/unit checks alone do not count as a browser pass.
The [5fe installed checkpoint](composer-compatibility.md#current-5fe-installed-checkpoint--2026-11-17)
records complete human, negative, controlled recovery and fake-provider Assistant
runs, plus independent representative operator evidence. Earlier bc20 and
Note/Course publication results retain their own pins. Current bd056 validation,
remaining T6 workflows and final integrated review remain open. Scripted model
results are distinct from authenticated-provider acceptance and actual owner cutover.

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
attempts all seven defined endpoint refusals, with public and receipt-inclusive
before/after audits. `t7-5fe6-negative-1` passed this complete mode in 256s: all
seven original responses were semantic HTTP409 refusals, the full capture and
816 canonical/receipt files stayed equal. Observer-disposed warnings remain in
that evidence; they were not substituted for the original responses. This is
5fe evidence, not a bd056 pass.

### Assistant scenario (historical failures and later pin-qualified passes)

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

The earlier full-run failures remain retained evidence. Later installed acceptance
passed the complete seven-case Assistant workload at package `bc20ea554d5d8de92934c9bf4ec989229d23047e`
and the normal human-authoring full scenario at package
`71126775a97feab004145dde63a768684e8e3cd9`; see the pin-qualified compatibility
ledger for source revisions, commands and evidence. These passes do not establish
a runtime pass for the current `5fe6d8d92f5013943053491794c0502b83228d53` candidate.
Older full-run journals without successful per-save evidence still cannot authorize
generation changes.

Assistant response observation journals the successful receipt before waiting for
UI completion. A normal Apply (or recovered lost Apply) must show `Status: applied`
and an enabled Undo control before the harness navigates away; Undo must show
`Status: undone`. These waits are bounded and do not replay operations. The
intentionally lost initial response is handled by fresh-browser recovery first.
Run `assistant-ui-settlement.test.mjs` separately under the heavy guard: its small
browser fixture verifies that an open review or disabled Undo does not count as
settled. It starts no authoring server and touches no canonical workspace.

## Bounded shared-source and unsupported-request proof

The [canonical-read-only Assistant recipe](composer-assistant-readonly-acceptance.md)
provides repository-relative Inspector/Assistant checks and exact existing-run event
recovery. It preserves full capture equality and explicitly allows derived JSX repair
as a normal read effect. It supplements the mutation/Undo matrix; it does not replace it.

### Saved Content reads at browser boundaries

The full/negative/recovery/fake-Assistant harness observes the two finite saved
Content preview operations from the original `request` event, before a response
exists. Navigation and profile close join those admitted requests through response
completion, body validation and any exact installed-client busy retry. The bound
is the existing 180-second native-read budget; timeout, transport failure, wrong
owner/renderer, forbidden response, or unresolved retry remains a failure. The
harness never retries a read, flushes drafts, or dispatches an extra mutation.

These mutating scenarios retain the nullable revision validation mode: an explicit
`stale-plan` refusal without a result may settle a background saved-state read,
while successful documents bind their requested revision and pack/renderer. This
is not the fixed-revision read-only geometry proof. Cleanup still closes its owned
browser after a failed drain and reports the failure; it cannot turn cancellation
into success. Controlled response loss continues to target only its separately
journaled write, not a saved Content read. Pure lifecycle coverage is
`node --test tests/native-authoring/content-preview-drain.test.mjs`.
