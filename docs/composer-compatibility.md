# Composer compatibility and acceptance ledger

Update this single ledger at each meaningful integration boundary, with exact
immutable source/package identities, workspace/schema identity, scenario, commands,
results and linked issue/PR evidence. The manager owns pins and lockfiles.
Tracking: [#51](https://github.com/zudolab/pinsel/issues/51),
[T0 #52](https://github.com/zudolab/pinsel/issues/52).

## Current candidate at a glance

Historical entries retain their original revision and outcomes. A package change
requires fresh installed acceptance; earlier passes do not automatically transfer.

| Identity or gate | Current recorded value |
| --- | --- |
| Pinsel integration | Local continuation of draft [PR61](https://github.com/zudolab/pinsel/pull/61); Results consumer `2322a14455df50ba5c72822ce64f52fce0c48cbe`, general/static consumers `66865aeb1dab917057b1186c2a584855a662b19c`. This reconnect wave has not been pushed or merged. |
| Installed package / upstream attestation | `c5ffd410f74ba4b3aa003da068efeeae6e663c37` / `ca5b4fe3cbe568daeb1964622b9be07dd994e660` |
| Component contract | `c0b452da075b66757c60bd0d721a47062d4354d0` |
| Workspace / renderer | `pinsel`, stage `notes-v1`, snapshot 1 / Composition 2, pack `pinsel@0.4.0`, `pinsel-zfb@native-v3` |
| Current upstream checks | Public/CMS/full typecheck PASS128s; independent complete782-file repack; [current-head CI44118271141 PASS](https://github.com/Takazudo/zudo-composer/actions/runs/44118271141) |
| Current installed checks | Four immutable pins, frozen installation and dedupe pass. Public capture PASS13s;1275 raw files unchanged; only snapshot/pack/renderer digests change. Installed Mapping phase13 PASS260s and full human regression PASS1001s, both independently audited. |
| Previous aa8 installed evidence | Six-route owner-selection matrix complete; retained static preview/build PASS183s and visitor PASS54s; Header href forward saved then separate readonly recovery PASS285s, inverse PASS411s, restart PASS118s. Original failed forward remains FAIL. |
| Results progress | Phase12 binding saved once; original run failed after acknowledgement. Separate readonly recovery PASS176s proves exact saved binding, reload, settled reads and unchanged capture. History has18 entries after phase13 count-binding PASS260s, phase14 collection PASS250s, phase15 limit PASS291s, phase16 pin PASS391s and the separate phase17 duplicate PASS400s. Phase18 saved its Mapping once, then failed before reload; separate read-only recovery is pending. Original failures remain recorded; phases19–44 and FAQ remain pending. |
| Historical full acceptance | At b434/5fe: human PASS969s; semantic refusals PASS256s; controlled recovery PASS270s; fake-provider Assistant seven-case PASS3455s. Current c5 human, negative, response-loss recovery and static gates passed; seven current-pin Assistant scenarios have qualified individual evidence, with interrupted suites and Local cleanup failure retained. |
| Holds | Remaining T6/T7 scenarios, current-head checks/review/merges; actual owner-data cutover and new authenticated-provider acceptance. Deployment remains disabled. |

## Current c5 installed checkpoint — 2026-11-17

The Results consumer at `25e49398e94728a7be2c062972b5fecbdc384c87` passed
phase13 in260s after a separately sealed boundary13 installation transition.
One acknowledged count-binding write reached Saved and settled31ms after its
recorded response, then the exact qualified Mapping was read back after reload.
The label binding from the failed-and-recovered phase12 remains unchanged.
Full capture changed only by the intended Mapping operation:
`c91698b3027d620ec3e5103af4947d1f15e51c83a588ecbf023b6b3a1d5c351c`
→ `0dc53724a2644555c801493354dfa24274a274ead0dcda384e997ca4ac1f6c79`.
History14 preserves its previous thirteen entries and appends this proof once.
Independent audit verified211 frozen inputs and all60 recorded family source hashes.
This is browser reload persistence, not a separate process restart or Content preview
pass. The journal is not a complete inventory of all unrelated library reads.
Evidence: `results-phase13-c5-independent-completion-review.json`.

The general consumer at `66865aeb1dab917057b1186c2a584855a662b19c` passed the
full human scenario in1001s: semantic selection, local insertion and typed field
save/reload, shared price/label/order changes, stable and legacy course-link behavior,
exact snapshot build and supported restoration. Six acknowledged Content saves
advanced token18→24; four linked Composition receipts cover insertion, two field
changes and removal. Baseline values are restored while history remains retained.
The final capture is
`871d327e6e9bb2bab8e234cd66ba4cc82ab9f9adae3f5e83a5be851ffce34a4e`.

Snapshot A (`e88bb89b5a7eb05fc6883325d63900acb9189f9f074a478d592881d3ca494d1b`)
built14 routes and verified143 asset files after later edits produced B. The complete
B capture equals the post-build capture; building A does not mutate B. Independent
review reran output verification against the actual files. Eleven screenshots remain.
Three legacy non-Content observer-disposed response-body diagnostics are retained;
those lost bodies are not independently validated. The Content request-drain protocol
passed. The consumer is clean and stopped, with its port closed and lease absent.
Evidence: `t7-c5-full-1/terminal-audit.json`, `t7-c5-full-independent-audit.json`.

Current-package negative acceptance passed277s: seven unique operations received
the expected semantic HTTP409 refusals, with complete captures unchanged at
`871d327e…` / Content token24 and892 receipt-inclusive files unchanged. Independent
review verified all cases and sixteen settled Content drain checks. Seven legacy
non-Content observer-disposed diagnostics remain qualified. The actual refusal bodies
were collected through the reviewed Playwright `route.fetch`/`fulfill` interception;
this is not an original-request-only transport trace. Evidence:
`t7-c5-negative-1/terminal-audit.json`, `t7-c5-negative-independent-audit.json`.

The cold consumer at the same66865ae source passed retained authored-static-page
restart/build in173s and production visitor acceptance in57s. Complete before/after/
after-build captures equal
`f9457c8cb6446667bdc913caecf82cfe27196eac16254161d28366cadeaf55e8`.
The actual build verifies16 routes,143 assets and160 total files, with705 GET/HEAD
visitor requests and zero canonical writes. Original fifteen-phase authoring evidence,
failed Header forward, readonly recovery, inverse and separate restart remain preserved.
The current installation bridge independently verifies314 frozen entries,316 loaded
inputs and2172 preserved raw files. There is no standalone frame-ready transcript;
fresh inverse Header History UI remains NOT_RUN, and inquiry delivery was NOT_ATTEMPTED.
Evidence: `static15-c5-independent-review.json`, `static-resume-c5-terminal-audit.json`.

Current-package response-loss recovery passed293s. It withheld the forward response,
restarted the browser and recovered the exact same request and durable receipt,
then stopped the server, captured and performed the guarded inverse. Final capture
`d4a9bebf1309b49817c5fa47643bf55ee096173c88817720ec87362cee4a598b`
restores canonical values with Content token24 unchanged and history retained.
The actual server response was observed through `route.fetch`/`fulfill`; one legacy
observer-disposed diagnostic remains. This runner has no outer-exit86 hook; the
historical controlled outer interruption is a separate result. Evidence:
`t7-c5-recovery-independent-audit.json` and `t7-c5-recovery-1/terminal-audit.json`.

The current fake-provider Assistant suite is **NOT_PASS**. Course, FAQ and Note
completed proposal/Apply/Undo with independent review: proposal captures remained
unchanged, only the intended Content field changed, original values were restored,
and Content tokens advanced24→30. Course also recovered its exact Apply receipt.
The command omitted `--max-run 5400`, so the heavy guard's default1800-second limit
interrupted the local component case with exit124. This was an invocation/admission
error, not evidence of a product failure. The local Apply and Undo both committed;
the original HTTP200 Undo receipt matches the retained durable receipt and undone
status. A fresh stopped public capture equals the full pre-Apply local fixture state:
`81a30b26896ed76e875bc787c978b69ffe15df6207849f23a5bbc5b99a8d49f0`.
Undo UI completion was interrupted. A separately reviewed, exact one-paragraph
cleanup dispatched once and committed. Its runtime remains FAIL134s because the
original CDP response body was unavailable. The retained durable receipt and full
public capture independently prove that only the intended Paragraph was removed;
all original values are restored with Content token30 unchanged. The resulting
capture is `743d9533774f6c31c11b28709bbeb183aed156aa6eea41442aab9011c7f3a62e`.
No Undo or remove was replayed. Fresh complete seven-case execution has started in a new artifact directory
with an explicit5400-second guard limit; its result remains pending. Insertion, stale Apply
and guarded Undo acceptance remain open. Preserve both failed runs and their
separate reconciliation evidence. Receipt revisions do not establish History UI
verification. Cleanup evidence: `t7-c5-local-cleanup-independent-review.json`.
Evidence: `t7-c5-assistant-{course,faq,note}-independent-review.json`,
`t7-c5-assistant-local-interruption-independent-review.json`.

Results phase14 collection and phase15 limit subsequently passed, reaching history16
and full capture `2d7041082fbf9860ae9af5a8f872c63138e2b8626d66d2d03f1707e665edf3af`.
The first phase16 pin attempt failed before writes. A separate read-only diagnostic
observed the actual heading `Ordered pins Choose`, while the driver's exact
`Ordered pins` selector never matched. That diagnostic itself remains FAIL because
of a terminal harness assertion; its complete observations and unchanged captures
are retained. Reviewed selector/readiness and source-rebind helpers passed262 family
tests. The consumer source upgrade to7b72430 preserves1003 raw files,790 runtime
files, eight manifest/config/lock files and all four installations. Distinct stopped
public captures fully equal the accepted phase15 state. The emitted source-rebind
record independently verifies272 frozen inputs. A new phase16 then passed391s:
one acknowledged pin save, exact public Mapping readback after browser reload,
settled reads and a complete pin-only delta. Existing bindings and unrelated state
remain unchanged. History17 preserves history16 and appends its genuine proof once.
The final capture is
`6a7e3bca691245240e7ca120f76e6c7ff817c74ac4cd003bc85ca10ca4f8a608`.
This is browser reload persistence, not a separate process restart or placed-family
rendering proof. Evidence: `source-rebind-baseline-7b72430-final-audit.json`,
`results-source-rebind-7b72430-descriptor-independent-review.json`,
`results-phase16-c5-independent-completion-review.json`.

Phase17 duplication then failed448s while waiting for canonical completion. One
original Composition request returned a `needs-output` challenge for181 targets;
no canonical receipt or continuation was recorded. Full before/after captures remain
`6a7e3bca…`, the proposed duplicate is absent, history17 is unchanged and phase18
was not started. A pure test reproduces a harness race: a continuation arriving
before prior-response bookkeeping completes can wait on its own challenge. The
original waiting payload was not logged, so this does not definitively establish
the actual failure's cause. Reviewed test-harness source `b18947f919c9cd9f097de8ea7206e99aa84b63bb`
joins only earlier response bookkeeping, then reclassifies the continuation while
retaining durable response journaling and exact output/record guards. Integrated270
family tests pass. Consumer/package source is unchanged; an independently reviewed
boundary17 source transition and a new actual scenario remain required. Evidence:
`results-phase17-output-challenge-reconciliation.json`,
`family-continuation-b18947f-independent-review.md`.

The six-route c5 owner-selection matrix passed: Home101s, About102s, Voices99s,
Notes99s, Contact99s and404104s. All twelve full captures equal `f9457…`; independent
review verifies62 artifact hashes and1164 source hashes at66865ae. It checks one
representative owner per route: Home Hero, four Breadcrumbs and Not found. Selection
uses rendered DOM click and tree Enter, not trusted pointer hit-testing, every
component or a standalone frame-ready transcript. The original process continued
through the connection change; no phase was repeated. Evidence:
`route-selection-c5-independent-review.json`.

A reconnect audit found a remaining browser helper from the interrupted first AI
run. This supersedes the earlier no-owned-process observation. Its exact identity
was verified before a single SIGTERM; it is now a non-running PID1-owned zombie,
as is the completed route-matrix shell. All sixteen previously hashed AI interruption
and cleanup inputs remain unchanged; that equality alone does not prove the orphan
harmless. Fresh AI2 admission verifies no live owned helper before startup. Evidence:
`t7-c5-old-ai-artifacts-post-orphan-independent-rehash.json`.

The second complete Assistant attempt was interrupted after Course restoration and
FAQ Apply. Its explicit5400-second guard limit had not elapsed; the cause is unknown.
An identified orphan server was stopped, then a supported stopped capture exactly
matched the FAQ-applied state
`49e79c4644bc68c7a7ebb2a96f946f00752c2eb801123de66c45cc4b9374639b`,
Content token33. The Apply revision is `37cf531c-4332-4444-ba9b-6c520b8ad773`.
No FAQ Undo was committed. A separately reviewed recovery wrapper subsequently
failed its request preflight in71s before dispatch; complete before/after captures
remained unchanged. A separate read-only diagnostic failed260s and identified a
Composition list request encoded in the body rather than an operation header;
it also left the full state unchanged with zero Undo dispatches. These are harness
preflight failures, not successful restoration or completed Assistant acceptance.
The original first/second interrupted attempts and both subsequent failures remain
preserved. Evidence: `t7-c5-assistant-2/interruption-reconciliation.json`,
`t7-c5-faq-undo-1-independent-failure-review.json`, and
`t7-c5-faq-readonly-preflight-1/terminal-reconciliation.json`.

The fixed boundary17 source successor was independently reviewed, then integrated
with295 passing family tests. The stopped Results consumer moved from7b72430 to027bec0
through an exact18-file tests/docs allowlist. Separate captures passed12s and10s;
both complete objects equal the accepted phase16 state `6a7e3bca…`. All1003 stored
files,790 runtime files, eight manifest/config/lock files and four c5 installations
were preserved. The old tracked source was archived. The emitted successor descriptor
`8d7de672be22e5a47382decbe4fea925529794b060c35613da2199eebc498b75`
binds freeze `34b70546ced41c4a2f4208e2d6aebb566d167621a225be5e3e0660ef09813fef`;
independent review rechecked all300 frozen files and retained the298 prior hash
expectations. This qualifies the test-source transition only: original phase17 is
still FAIL, history17 is unchanged, and a new browser pass remains required.
Evidence: `source-successor-027-baseline-final-audit.json` and
`results-source-successor-027-descriptor-independent-review.json`.

The new phase17 then passed400s. One logical duplicate used an initial output
challenge and a continuation for the same record; the latter acknowledged the
canonical save. The new Composition is
`composition-5c412ff8-d1b0-4b66-ae4c-cae9501ca050`, with root
`pinsel-result-row-56c39585-def6-4a4e-93a4-6236720f66d1`.
Exact full capture changed from `6a7e3bca…` to
`5f20c17d59ea6f35c7e5cc2f503264822f41d479922cd4c7c428e48c440f9ce4`.
Independent review verified the duplicate-only delta, qualified public readback
after browser reload, three settled-read boundaries,302 input hashes and72 source
modules. History18 preserves the old17 entries and appends this genuine proof once.
The original failed17 remains FAIL. This proves browser reload persistence, not
process restart or placed rendering. Evidence:
`results-phase17-successor-independent-review.json`.

FAQ restoration subsequently committed through one exact Undo dispatch. Its original
run remains FAIL121 because the response body was unavailable. Separate receipt and
history reconciliation confirms Undo revision
`5e3bad4f-3a48-4a86-ab8a-3968a6538ea2`, whose parent is the original Apply revision.
Full capture changes only the FAQ answer back to its original value and the normal
generation, timestamp, Content token33→34 and digest. The restored capture is
`e300f832e859bcc15cad3a3f09c3095b2a493198ec7d933ae8970578d92be077`.
A dedicated read-only public reconciliation passed103s: UI Status undone, exact
applied/undone receipts, complete seven-revision history and full Content readback.
Its complete before/after captures are identical. This separate success does not
recover the missing original response body or make the interrupted whole suites pass.
Evidence: `t7-c5-faq-undo-2-independent-reconciliation.json`,
`t7-c5-faq-readonly-reconciliation-1/public-evidence-audit.json` and
`t7-c5-faq-undone-manager-visual-review.json`. The screenshot explicitly identifies
the deterministic fake provider; it does not establish authenticated inference.

Remaining Results/FAQ scenarios, complete current-pin Assistant acceptance and final
integration gates remain open. Actual owner-data cutover and new live-provider
acceptance remain held. No deployment or remote cutover occurred.

## Recovered AI evidence and saved Mapping checkpoint — 2026-11-17

The general consumer remains frozen at66865a with c5. Seven representative AI
scenarios now have individual evidence, not a whole-suite PASS:

| Scenario | Actual outcome |
| --- | --- |
| Shared Course pricing | Proposal, Apply, response-loss receipt recovery and Undo passed inside a subsequently interrupted suite. |
| FAQ | Undo committed once; original response-body loss remains FAIL121. Separate public read-only reconciliation PASS103 verifies receipts, seven revisions, undone status and restored values. |
| Note | Finite PASS355; all1787 body characters restored, Content token34→36. |
| Local component fields | Proposal/Apply/Undo passed. Cleanup Remove committed but its original body was unavailable: overall FAIL692. Separate retained receipt and supported full capture prove fixture removal and original values restored. No cleanup replay. |
| Structural insertion | Finite PASS402; one qualified Paragraph inserted and undone, with complete final capture equal to baseline. |
| Stale proposal | Finite PASS373; exact held Apply refused409 `stale-plan`, same-server identity unchanged, explicit human inverse restored values. |
| Guarded Undo | Finite PASS575; Undo refused409 `revision-conflict` with full capture unchanged. Explicit human inverse, not AI Undo, restored the price. |

The artifact-only aggregate `t7-c5-ai-seven-case-aggregate/report.md` and manifest
hash159 original evidence/review/screenshot files. Independent per-case reviews are
linked there. Final supported capture is
`79ca4df8bb73c42308ff5fbbe40fe451fa3165cea96991cb36c9f7a90c1f13f5`,
Content token41. Whole-state comparison with the first c5 AI baseline preserves all
values, arrangements, references and identities; only the named edited owners'
generation/timestamp metadata, domain tokens and digest differ. The frozen consumer
is clean and stopped. Original suite1 default-guard interruption and suite2 unknown
interruption remain NOT_PASS. Deterministic fake-provider and intercepted transport
qualifications remain; this is not authenticated inference or full History UI
acceptance. Local cleanup has no separate rendered/restart proof.

Results source moved from027bec0 to2322a14 through an independently reviewed
16-file tests/docs change, preserving the four c5 installations and saved state.
Integrated340 family tests passed. A create-specific semantic readiness check avoids
waiting on unrelated library network idle while retaining read drains and exact
mutation admission. Its fixed boundary18 handoff preserves all earlier evidence.
The fresh phase18 created exactly one Mapping,
`mapping-8bfc8c53-c134-4b82-94ae-52294218aa03`, with one original200 response.
Full capture changed only by that Mapping from `5f20c17d…` to
`29003f700865ae25baad818829a8ee0c16b11620d1a28d2273ea05f2aad1de17`.
The run remains FAIL607: the subsequent pre-reload network-idle wait timed out.
Derived challenge141 was abandoned and late read dispatches/refusals remain
qualified; no original read settlement or reload success is claimed. Independent
`results-phase18-independent-saved-recovery-review.json` confirms the exact saved
delta. History remains18 entries. Do not repeat Create or append a successful phase
until a fresh read-only selected-Mapping/reload proof settles and preserves the full
saved capture. Source-only recovery work is on `test/mapping-create-saved-recovery`;
no recovery run has yet been accepted at this checkpoint.

No push, merge, publication, deployment, owner-data switch or new real-provider run
occurred in this reconnect wave. Remaining Results/FAQ acceptance and current-head
integration gates stay open; issues57/58 remain held.

## Mapping save completion candidate — 2026-11-17

The aa8 package fixed qualified Mapping startup (actual editor readiness41.313s),
but phase12 saved its binding and then waited for unrelated library discovery.
The original run remains FAIL341s. Recovery reads verified the exact acknowledged
binding without replay, with unchanged full capture `c4c8f59be368ad984e5711569e1c85d5804ec40ed41146eb68ee3b99756088e0`.
Two abandoned no-commit challenges in the original run remain recorded. Known
read aborts in the recovery occurred after its terminal fence; its screenshot
is not a Content-preview acceptance pass.

Composer source `37cd60fd0ae0a54fb4ea494b78abc603f68813c0` removes unrelated
library discovery from durable save/create/duplicate completion. Selected resolution,
concurrent changes, visible errors and complete diagnostics on library return remain
validated. Author91 Mapping tests and independent17 focused tests pass.
The package has782 files, payload
`bc44f1c4e0778929fb69494a523d8148ee68530f3f320064412a18d1ef44bd47`.

Manager installation preserves all1275 native/public/build evidence files byte for
byte and mode for mode. Complete public captures differ only in digest,
componentPack.digest and renderer.digest. The resulting capture is
`359d270bc77313e55b29d4580516cf6930b6a094a06a967f1e7efe8a63f8cb09`.
Evidence: `mapping-save-main-preservation-audit.json`,
`mapping-save-main-after.log`, `mapping-save-c5ffd-package-independent-review.json`.

The Results continuation uses a strict boundary13 installation supplement that
retains the original12-entry descriptor, the genuine phase12 recovery and all
failed-attempt evidence. No saved binding is replayed or old proof rewritten.
Initial adoption left preparation and installed acceptance pending; the current c5 checkpoint above records the completed preparation and phase13 pass.
Header inverse restored all authored values and retained the new static page;
normal Content token/generation advancement remains. A future static installation
bridge must validate this closed cycle explicitly, not treat it as identity-only.

## Historical qualified Mapping navigation candidate — 2026-11-17

Results phase11 Mapping creation was acknowledged, followed by a separate readonly
recovery (PASS394s); creation was not replayed. Phase12 has not written a binding.
Three readiness attempts failed with the full capture unchanged. A further readonly
diagnostic observed 170 samples over180s: the Mapping library showed the target
row Ready while the selected editor remained absent. This diagnostic is not a
binding pass. The accepted Results history retains twelve entries, including the
explicit phase11 recovery; original failed attempts remain recorded.

Composer's qualified deep-link initialization now resolves the selected Mapping
before unrelated library definitions. Attachment checks still precede the handoff.
Library diagnostics remain complete on return, with bounded per-refresh qualified
read sharing. Source review and81 focused tests passed independently; integrated
public entries, CMS fixtures and full typecheck passed146s. The reviewed candidate
`aa8d0df2feec56f6f3f887f9653db9bf7b30d6e0` has782 packed files, payload
`6dc60a8942f1872df263b4c44224f2a7b68536b7f2c9de6d5a3d26080a07ffe7`.
Root frozen install and dedupe checks passed. Fresh public captures before/after
installation differ only in digest, pack digest and renderer digest; all other
fields and1275 raw native files match. After digest:
`e5d189c6068f48eb90f54e8dfedba2797a9882cc4f7d8cd4bc3e59d0d5511135`.
Evidence: `mapping-library-main-preservation-audit.json`.
Installed Pinsel acceptance remains pending. A frozen installation bridge must
preserve the complete existing history and saved state before continuing phase12.

The initial d49 geometry attempt failed in a test selector, with equal complete
before/after captures. A corrected selector has a real isolated Playwright proof
and independently reviewed source and binding; installed two-visit acceptance passed249s with independent audit. All four full
captures equal, and both visits passed1600/1280/1600 geometry with the same
iframe document. Evidence: `content-layout-relative-browser-1` and
`content-layout-relative-browser-independent-audit.json`. Static retained-preview validation reached its UI assertions
but failed during port release before the final capture/build. A stopped capture
matched the original exactly. Its reviewed shutdown correction waits for the owned
wrapper, port, lease and live process group;82 tests pass. It does not kill foreign
processes or remove leases. These repairs do not relabel the original runs as passes.

## Responsive Content preview package — 2026-11-17

The preceding bd056 installed saved-host scenario passed in237s, with independent
review of both fresh visits' original context/document/iframe acknowledgements,
four identical full captures and zero canonical writes. Evidence is retained in
`host-content-final-browser-1` and `host-content-final-independent-review.json`.
That run used a native heavy-queue path rather than the established workspace queue;
its deviation remains recorded, and absence of overlap was observed only at one
point in time. No layout/geometry pass was claimed.

Screenshot review found long controls and qualified values overflowing the narrow
preview pane. Composer now bounds its grids and controls and wraps those values,
using existing UI components. The immutable d49 package changes only three shipped
UI files; no renderer/protocol/authority code changed. Independent actual packing
matches781 files, payload `8caa86fe8dc1607d18ada534df7215923c62f52c1c2f07610e51cc54230252b0`.
The full public/CMS/typecheck gate passed192s, with no generated fixture changes.

All four Pinsel consumers now install d49 from the frozen lock. Root before/after
captures differ only in snapshot digest, pack digest and renderer digest; the
compiler identity is unchanged. All other full fields and1115 raw files remain
exact. Evidence: `content-layout-main-preservation-audit.json`; after digest
`f4678725966b018f0b4fa0394e46e59facad4bd847019928993f2b57575f14c5`.
Installed narrow-pane geometry/restart acceptance remains pending on this new pin.
Historical bd056 and5fe results do not substitute for that check.

## Saved host Content preview adoption — 2026-11-17

At this earlier checkpoint all four manifests pinned Composer `bd056471996984dd39bba219b19add25eb092982`.
Attestation `077a1b1a8545e963bcca7f4330a2b4e9fc4e5f95` independently matches all
781 packed files (payload `aa0deee4bb54c6f07fefd46dba58db80d50de3261dc4814bbb35d680280123b7`).
The separate component contract stays `c0b452da075b66757c60bd0d721a47062d4354d0`.
`pnpm install --lockfile-only` and `pnpm install --frozen-lockfile` passed with Node24 /
pnpm11.5.2; four consumers resolve one installed package. The first nested npm install
failed before installation because its default cache was read-only; the retained retry
uses the existing workspace cache. No package publication or deployment occurred.

Supported stopped captures before/after installation differ only in the four explicit
package identity paths: snapshot digest, component-pack digest/compiler and renderer
digest. All other fields and 1115 raw native/history/public files are equal. Evidence:
`host-content-main-preservation-audit.json` under the retained integration notes.
The resulting capture is `b4637d5096f8bbe89b7326b41f96a21952912cc992946ad7d37906fae10ddea1`.
This proves preservation, not browser acceptance. A separately frozen installed consumer
will verify saved affected-page discovery, the real Pinsel document renderer, original
frame acknowledgements, batching and restart equality before this scenario is complete.

Saved affected-page preview deliberately excludes unsaved Content drafts and standalone
fragment rendering. Its explicit route selection uses qualified bindings; it is not an
activated-release preview. The finite acceptance read contract rejects unknown operations
and stale read-only responses. Existing 5fe scenario passes below remain historical.

## Current 5fe installed checkpoint — 2026-11-17

The four complete b434/5fe runs used the committed
`tests/native-authoring/run.mjs` entrypoint with `--scenario full`, `negative`
and `assistant`, plus the independently reviewed controlled interruption recipe
and the unmodified `--scenario recovery --restore` runner. Evidence is retained
under `/workspace/composer-adoption-notes/`, in each named run's
`operator-summary.json`, original result, public captures, receipts and screenshots:

- `t7-5fe6-full-1`: nested selection/edit/reload, shared pricing/contact labels and
  ordering, restart and exact older snapshot build after a newer edit. The build
  contains 14 routes / 143 public files and leaves the newer state unchanged.
  Supported restoration retains history at
  `c6b4ddbf00fcd40177263cd27d1f19b794efd6ac954eefd110ef29bad3192fe1`.
- `t7-5fe6-negative-1`: all seven original case-specific responses are semantic
  HTTP409 refusals; the complete capture and 816 canonical/receipt files remain
  equal. Seven generic observer-disposed warnings are retained; the separate
  original case responses were retained and asserted, not inferred from those warnings.
- `t7-5fe6-controlled-recovery-1`: outer exit86 after the real save and fresh-browser
  receipt recovery, followed by the actual guarded UI inverse. This is bounded
  post-receipt interruption, not an arbitrary mid-write crash. Canonical values
  restored with history retained at
  `3b53b5dc441191e979c5d3c633fe89334fe8dc0dd718a55cc8f198064aad7314`.
- `t7-5fe6-assistant-1`: Course, FAQ, Note, local field, structural insertion,
  stale Apply and guarded Undo conflict all pass in the complete unfiltered run.
  All five proposals leave canonical state unchanged. Lost-response recovery
  returns the same request and receipt; stale Apply is `stale-plan`, conflicting
  Undo is `revision-conflict`. Final canonical restoration retains history at
  `96b956c6b91a6cbc8c2c5cb7644df9905b6d43af202671739b431173e0e3ae28`.
  Eighteen screenshots are retained. This uses the deterministic fake provider;
  it does not prove authenticated inference.

Independent documentation-operator evidence is under `docs-operator-0180/`.
`header-forward/proof.json` and `header-forward-restart-f54/proof.json`, followed by
`header-inverse-06be9ad/proof.json` and its restart proof, complete the **label**
cycle. The inverse restores `講師紹介` and its exact static output; the full restart
capture remains `d0b19edc89b7bde72f5ff2f695e41d8bce9125f0ef33e58e710aee2b8487c36b`.
Header href-to-new-page acceptance is still separate and incomplete.

Knowledge's `knowledge-forward-06be9ad` remains FAIL397s after a confirmed original
Content200 and public readback: its terminal global-idle wait timed out. The
separate `knowledge-recovery-b8b9af7/recovery-proof.json` is an actual
`SAVED_REFERENCE_RECOVERY_VERIFIED` PASS110s: read-only restart, Lessons card click,
exact online-exam Note heading and 14-route / 143-asset build all succeed without
replaying the save. Full capture stays
`88860bcc15a36223f355ace89ca9f3522b92e7d6bdac6b9aab0cbebd9afa66c4`.
The separate `knowledge-inverse-b8b9af7/proof.json` now records an actual
`PUBLIC_CAPTURE_VERIFIED` PASS299s, restoring the qualified reference from
`online-exam` to `exam-schedule`. Its embedded read-only restart and exact
14-route / 143-asset build passed; all five full post-write captures equal
`65e99639902bf5f34299fc1f4a545a6ef60e094d126581c5d3e6a0d769a4d500`.
The original forward FAIL remains distinct from the recovery and inverse passes.

Results `results-family/00-0014ca2` through `10` retain eleven accepted phase
proofs (11/45), including pair publication and duplication of Composition
`composition-49940615-0119-4700-9171-dcfde8f74718`. The accepted predecessor is
`c760809f4c1686bda8f1b6fd0b5fd18cb32e7ccd22aa737f233267ebd183310a`, with
`results-family-history-11.json` containing successes only. This is not completed
family rendering. Phase11 first failed before dispatch (FAIL169s; full capture
unchanged). The separate `results-family/11-readiness` failed after exactly one
acknowledged Mapping creation (FAIL234s), producing
`mapping-b22b89eb-6ba3-4472-9543-92ccb7670669` at capture
`c21a9435009b15892ef923780a0fdf38fe0e0b5774fdfbe926f159ac09399af8`.
Its immediate URL assertion failed before asynchronous navigation completed;
`results-family11-readiness-delta-reconciliation.json` verifies only the intended
Mapping delta. Neither attempt is a PASS. Separate read-only saved-Mapping/restart
recovery is queued; no creation replay or accepted-history advance is authorized
by the delta proof. See `docs-operator-0180/operator-status-report.md` and
`results-family11-readiness-failure-reconciliation.json` for the retained failures.
FAQ's 43-phase sequence, membership/inverse, two-child order, three-state native
and actual static visitor evidence remain pending; follow the
[family acceptance recipe](composer-family-acceptance.md).

Static `t6-static-sequence-1/09/committed-reconciliation.json` proves the selected
metadata publication committed once, at capture
`20a67272091e8550588da52931a3ca6ba1e14e027655ed0f477f0f4218431474`.
The original attempt remains FAIL278s at its title assertion. The distinct
`static09-readonly-recovery-1/recovered-phase-proof.json` now proves normal restart
and preview, PASS68s with the complete capture unchanged. Publication was not
replayed. `static09-production-visitor-1/proof.json` then verifies the actual
production build (PASS7s) and browser visitor run (PASS14s): 16 routes, 143 assets,
705 requests, zero errors and zero canonical writes. Checks include metadata,
internal fragments, mobile navigation, FAQ keyboard use, TOC and invalid Contact
submission without delivery. The authored destination is intentionally Section-only;
its source page's Header remains the navigation owner.

The accepted static continuation is recorded in these original `proof.json` files
under `t6-static-sequence-1/` and in `static-resume-checkpoint-20261117.json`:

| Phase / artifact directory | Actual result | Saved operation |
| --- | --- | --- |
| 10 / `10-menu-label-v2` | PASS132s | Add navigation entry |
| 11 / `11` | PASS127s | Set navigation label |
| 12 / `12` | PASS126s | Set navigation target |
| 13 / `13` | PASS139s | Reparent authored page under About |
| 14 / `14` | PASS236s | Update page-copy route |
| 15 / `15` | PASS177s | Publish updated page-copy |

The earlier phase10 attempt remains FAIL229s before mutation, with full capture
unchanged; the later unique-heading selector fix does not relabel it. Phase15's
accepted capture is
`3777470221d254f0dea6134a30c4515e4647c2d1932542674359d85ef8fe22ab`.
Its final production build is queued/running at this checkpoint; no final
post-reparenting visitor PASS is claimed. The phase09 visitor proof applies only
to its own earlier snapshot. Header label and Knowledge representative cycles
are complete; Header href-to-new-page acceptance remains a separate pending gate.

All these runs use known staged data and the unchanged 5fe package. The new upstream
`bd056471996984dd39bba219b19add25eb092982` package has not been adopted or
accepted in Pinsel. `host-content-public-build-regenerate.log`,
`host-content-cms-generated-audit.json` and
`host-content-package-bd056-independent-review.json` retain its build, generated
identity and package review evidence; these are not installed-consumer passes. Preserve original failures,
retained histories and the separate actual-data/provider/deployment holds. Continue
[T7 #56](https://github.com/zudolab/pinsel/issues/56) with the live operator checkpoint,
remaining scenarios and required current-head integration gates.

## Refreshed baseline — 2026-11-16

| Identity | Inspected value |
| --- | --- |
| Pinsel source | `6df67ede4ae8c55dc80f8d66f8665b7b72a961eb` |
| Composer source main | `4668d61c3e5e568cea5385152840098a51ef24c9` |
| Installed Composer Git package | `13ed855a3268d91c114c3f5ee167d9ace9078d57` |
| Installed component-contract Git package | `c0b452da075b66757c60bd0d721a47062d4354d0` |
| Read-only CSS wisdom source | `5264fc3238c733af04ee23be53dc436228ae2e7d` |
| Pinsel component pack | `pinsel@0.2.0` |
| Hosted renderer | `pinsel-zfb`, version `hosted-v1` |
| Toolchain contract | Node `>=24 <25`; pnpm `11.5.2` |
| Current content | 25 models / 246 committed baseline entries |
| Current workspace authority | Hosted D1 head for legacy drafts; generated SiteProject for fixed structure |
| New native workspace/schema | Not initialized; no adopted native capture identity yet |
| Task / worker / branch | T0 / Pinsel documentation worker / `feat/full-composer-adoption` |
| New adoption scenario acceptance | NOT_RUN; baseline inspection only |

Observed commands: `git status --short --branch`, `git rev-parse HEAD`,
`git worktree list`, manifest/source/document reads. Initial Pinsel checkout was clean
on `main` with one worktree. This row records no new local build/test/browser pass.
[Header PR #50](https://github.com/zudolab/pinsel/pull/50) is prior integrated work,
not proof of full Composer authoring adoption.

## Separate historical real-provider evidence

[Issue #2 rerun](https://github.com/zudolab/pinsel/issues/2#issuecomment-6718440733)
records PASS at Pinsel `b43135cedb01932ab7013d4b20be2d2c3eaa2275`, Composer package
`fba434aaa96af8b4dbc2a086638180f71a2da741`, contract
`c0b452da075b66757c60bd0d721a47062d4354d0`; Claude Code 2.1.319, `opus` / `medium`,
Node 24.13.1, pnpm 11.5.2. This proves the earlier Note-only scenario at those
identities. New full-adoption real-provider acceptance remains NOT_RUN.

## Next verification boundary

T1/T2 must establish the public renderer and coherent native workspace capture
contracts before T3 adopts exact verified package revisions. Record the actual
package pin, migration rehearsal, browser selection/ownership, shared Content,
restart/recovery and static output evidence before claiming completion. Owner-data
import/cutover remains held for the current export and authorized reachable host;
no deployment or production authority switch follows from this ledger.

## Candidate rehearsal — 2026-11-16

- Composer source/package candidate: `b33f92aef1c94a366970808cd72264a1e0d9c402`
  ([draft PR #974](https://github.com/Takazudo/zudo-composer/pull/974)); not merged.
- Contract: `c0b452da075b66757c60bd0d721a47062d4354d0` (unchanged).
- Pinsel branch: `feat/full-composer-adoption`, [draft PR #59](https://github.com/zudolab/pinsel/pull/59).
- Workspace: explicit staged `pinsel` under `packages/pinsel-content/.native-authoring`;
  new snapshot envelope schema version 1, Composition schema remains upstream v2.
- Validation: Node 24.19.0 / pnpm 11.5.2 immutable Git install, frozen install and
  dedupe check passed. UI renderer tests 13 passed; public preparation test passed.
- Actual staged initialization and coherent capture passed using the installed Git package.
  Capture `ba87916a98db118b7609ab637b365731f32668b5a4eeba1309f408e807ff9060`
  contains 177 Compositions, 246 Content entries, 163 Mappings and 142 public files.
  Exact static build and browser acceptance are in progress.
  No full scenario is accepted yet. No owner data migrated, no legacy writer switched.
- Upstream aggregate gate, independent installed review and final dependency pin remain pending.

## Corrected live-preview candidate — 2026-11-16

- Installed Composer/source package: `61feb2632ce0fe61b4af6b05299f674e3e842586`;
  contract remains `c0b452da075b66757c60bd0d721a47062d4354d0`.
- Immutable install, frozen reinstall and dedupe check pass. The candidate adds
  local parent-placement editing, durable recovery, conservative frame settlement
  and isolated `@takazudo/zfb/zudo-react` JSX evaluation with runtime attestation.
- Earlier b33 static rehearsal passed all 14 routes and exact 142 public bytes;
  its independent live preview failed on the missing iframe settlement bridge.
  That is retained evidence, not a live authoring pass. New installed browser
  acceptance and exact recapture/build remain pending; existing staged data stays.
- ZFB remains 5.1.5. Registry/release inspection verified 7.0.0 availability for the
  main/runtime/WASM/slugify and macOS arm64/x64, Linux x64, Windows x64 packages.
  Linux arm64 npm 7 is intentionally suspended (latest 6.0.1); the GitHub standalone
  artifact is separate. Publication alone does not prove Pinsel compatibility,
  so no framework upgrade is bundled into this Composer acceptance cycle.

## Navigation and nested-tree candidate — 2026-11-16

- Composer package/source: `10f331bc2212c407693909d1e6eb6d03e73ccb72`;
  payload evidence commit `ea0e492b` records 749 shipped files, digest
  `74588162cae99c97133978ff78e146eeb99502260885c33401b5d95ca9feb2e1`.
  Contract stays `c0b452da075b66757c60bd0d721a47062d4354d0`.
- The preceding installed `61feb263` browser rehearsal rendered the actual Home
  and Lessons documents, selected the same owner-qualified Consultation target
  in the tree and iframe, and saved a parent-owned placement change across restart.
  A supported inverse edit restored the original ordering; two legitimate receipts
  remain. Shared Content, Mapping, Sitemap and child compositions stayed unchanged.
- That rehearsal found broken visitor navigation and cached catalog failures during
  coordinated capture. This candidate adds exact-route document navigation,
  query/hash persistence, expandable semantic hierarchy, and bounded safe read retries.
  Independent source review and focused tests pass. Installed navigation, live shared
  Content edits, fresh-browser response-loss recovery and exact recapture remain pending.
- Composer root TypeScript and lint passed at this candidate. The unchanged full
  Assistant browser suite still fails its Withdraw display assertion: the server
  returns the updated draft, but the UI retains the older draft. A focused upstream
  fix is in progress; this candidate is not an accepted completion or merge-ready state.
- Staged known-data workspace and history remain intact. No owner-data cutover,
  authenticated model inference, production deployment or framework upgrade occurred.

## Installed browser acceptance and final foundation candidate — 2026-11-16

The independently installed `10f331bc2212c407693909d1e6eb6d03e73ccb72` passed:

- Cold load of all 25 Content models; Home → Lessons and Sitemap → Lessons;
  nested Consultation selection at tree depth 3 with the exact rendered owner;
  actual visitor links, Contact `?course=1`, and query/hash preservation on reload.
- Live Content saves: consultation price appeared on both Home and Lessons;
  option-label change appeared on Contact. Supported UI saves restored original
  values and lifecycle, retaining legitimate Content history.
- A deliberately withheld successful placement-save response was recovered in a
  fresh Chromium process using the same operation ID
  `62b909cd-de7b-4eb1-85c9-375e9a69f987`. A supported inverse restored the exact
  original Lessons document. Mapping, Sitemap and shared composition bytes stayed
  unchanged. All owned servers and leases were released.

These were normal `pnpm dev` runs with unflagged Chromium. Node's Fetch port policy
rejects 4190; the readiness harness uses direct HTTP, while Chromium works normally.
Early harness readiness, nonexistent-link and required-label selector failures are
retained as failed attempts, not product acceptance. The three completed guarded
runs passed in 216, 369 and 270 seconds; the last includes a subsequently corrected
harness timeout timer draining after its assertions completed.

The current pin is now `e62e1a6ab3b2b783e56533ee510e4cfc27b24547`, with unchanged
contract `c0b452da075b66757c60bd0d721a47062d4354d0`. Immutable install, frozen reinstall
and dedupe check passed. It adds the reviewed Assistant state/readiness fixes and
neutral route-helper placement. Upstream full unchanged Assistant browser acceptance
passed (583 seconds, scripted provider only). Payload digest is
`6279138d1e5a80fc231144e24a5f591c196bc56170aa032001de6eb892f8a98a` for 750 files;
Composer evidence/source head `10e36be2f92082d02b748ce2c67cc89ae40f0199` also refreshes
generated demo identities. Final CI and this pin's changed-state browser → stop →
public capture → exact build → restart/inverse rehearsal remain pending.

No owner D1 data, active editor authority or real model provider was migrated or
accepted. Native staged data, original assets and all recovery evidence remain.

## Foundation integrated — 2026-11-16

Composer [#974](https://github.com/Takazudo/zudo-composer/pull/974) merged as
`a2ffab5e9c78900085fe0ed5bd713ba88b74bbe1`; Pinsel
[#59](https://github.com/zudolab/pinsel/pull/59) merged as
`9e2ab176a94a2d004bc3c1dbab278a43b0c2ec0b`. The installed package remains
`e62e1a6ab3b2b783e56533ee510e4cfc27b24547`, contract unchanged.
Premerge current-head CI passed both repositories; Pinsel postmerge CI
[43948848862](https://github.com/zudolab/pinsel/actions/runs/43948848862) passed.
Composer postmerge validation was still running at this checkpoint.

The exact e62 package passed changed-state browser save → stop → public capture →
static build → restart → supported inverse, guarded 694 seconds. Consultation
price ¥10,321 appeared on Home and Lessons; Contact label 進路相談・静的検証 and
Lessons placement order matched the saved state. All 14 HTML routes and 142 public
files matched captured bytes, lengths and SHA256. Snapshot/build digest:
`b50e826a840b8fc104ae970302d9428b5395ec148490d082801655ce85e67375`.
Original values, lifecycle and exact Lessons document were restored through UI
saves, retaining legitimate history at Content generation 10.

Evidence and resource audit are recorded in
[the integration checkpoint](https://github.com/zudolab/pinsel/issues/51#issuecomment-6928706760).
The old merged feature branches were deleted after checking merge ancestry and
PR dependencies; both primary checkouts returned clean to main. T4 now uses
`feat/semantic-native-migration` and Composer `feat/pinsel-semantic-authoring`.

Fresh public pre-migration capture of the restored workspace:
`9d9d33461da5b79fb4faaa118ca11e7939fdb7cc4efa36f681c6b392ca1a75bb`, workspace
`pinsel`, snapshot schema 1 / Composition v2, pack `pinsel@0.2.0`, renderer
`pinsel-zfb@native-v1`. T4 must transform that captured state into a separate
staging root and retain its source, rather than reinitialize from Git seed.
T4 implementation and T5–T7 remain incomplete. Installed negative endpoint tests
are being added before T3 closure. Owner-data cutover and real inference remain
held; no deployment or actual owner-editor switch occurred.

Foundation final audit: Composer postmerge
[43948802208](https://github.com/Takazudo/zudo-composer/actions/runs/43948802208)
passed. Independently installed e62 endpoint negatives also passed (299 seconds):
forged owner, shared field shadow, shared reorder, missing parent placement, forged
slot and forged placement all refused. Snapshot
`ff5700c6d91bd93b77662479aba2a06f95a5d2f5544fcaeb29f891d222340888`, all tokens and
799 canonical files were identical before/after, with no receipts. The isolated
clean worktree was removed normally and server stopped.
[Final foundation evidence](https://github.com/zudolab/pinsel/issues/53#issuecomment-6929152532).
This completes T0–T3; it does not complete T4–T7 or the data/provider holds.

## T4 semantic authoring candidate — 2026-11-16

Upstream [draft PR #977](https://github.com/Takazudo/zudo-composer/pull/977)
adds selected-entry identity, explicit pins, semantic host tree/typed fields/local
insertion, and a separate migration-source equivalence API. Source reviews found
and corrected strict DSL-input and fixture typing gaps. Focused Mapping 474 tests,
host editor 51 tests, capture/public DSL 23 tests, public type checks and independent
reviews passed. Packed public runtime/declarations/release portability passed
55 seconds after correcting its collection-route fixture.

Initial immutable package `9ad8bac4f7ede83fcf3a78f7b516d222152cea6f` installed,
frozen-installed and dedupe-checked successfully. A packaging correction adds the
new Mapping guide to the shipping allowlist; final package candidate is
`533be688e51ff150bce5e9bc87d2b07e62ebaec3`, payload 754 files, digest
`f68ed3d382fea81d0fa96105d38a4e95f6110021620e28b2dc1f815b612b3b42`.
Its immutable Pinsel install, frozen reinstall and dedupe check passed. Staged
migration and installed browser acceptance remain pending at this checkpoint. Contract remains `c0b452da075b66757c60bd0d721a47062d4354d0`.

The candidate migrates captured pack 0.2.0/native-v1 state into separately selected
pack 0.3.0/native-v2 state. Content fields/entries and original store/history remain
untouched; the migration map records exact structural/reference changes. Missing
managed-asset import support causes refusal before destination creation rather
than data loss; the known rehearsal has no managed Assets. All prepared public
assets are captured separately. No actual owner-data cutover or live inference.


### Staged migration and static proof

The known source capture `9d9d33461da5b79fb4faaa118ca11e7939fdb7cc4efa36f681c6b392ca1a75bb`
migrated into the separate explicitly selected `course-identity-v1` stage. The
97-second rehearsal passed with source currentness checked again after import:
17 project/reference changes, all 181 fields and 246 entries retained. The actual
post-import public capture comparison permits only positive entry generations
resetting to 1 in the newly initialized store; Consultation changed from 9 to 1.
All Content values, timestamps, lifecycle, model schemas and qualified identities
matched. This is an initializer metadata reset, not a Content mutation-token claim.

Initial staged snapshot:
`5b338c602b1ed8570eba0996a3cae3d593ab1e0220ee9e639a6da9d57dff1986`,
pack `pinsel@0.3.0`, renderer `pinsel-zfb@native-v2`. Its exact static build passed
in 8 seconds: 14 HTML routes and all 143 captured public-file hashes matched.
Compared with the old source, only the Contact visitor script changed and the
course identity helper was added; CSS and assets remained unchanged. Original
`.native-authoring` and `.native-public` remain authoritative unless the stage
is explicitly selected. No owner-data import or cutover occurred.

The first browser inspection became stale after a concurrent test-file edit;
Composer's Vite watcher correctly invalidates the preview for watched changes.
A frozen-source retry reached the current preview and selected the semantic
Consultation owner correctly. The installed read-only browser inspection then passed (152 seconds): semantic
Consultation selection at depth 2, advanced wrapper visibility, shared controls
disabled, legacy aliases 1/2/3/01 and all three canonical IDs selecting the correct
Contact option, and Home links using canonical IDs. Full mutation/restart/build
browser acceptance remains pending.

[Migration checkpoint](https://github.com/zudolab/pinsel/issues/54#issuecomment-6929759951).


### Explicit draft Save correction

Installed533 acceptance found that a local field draft incorrectly invalidated its
own saved preview, disabling Save. Composer31cbdffd corrects the subscription to
ignore only local session-registry changes; canonical provider and native source
changes still invalidate. The real integration regression failed before the fix
and passed afterward (15 focused tests); independent review and11 focused tests
also passed. The unrelated Mapping browser test now verifies collection identities
and persisted Single-mode selection correctly; its focused real browser passed27s.

New immutable package `1d7bb65c7b53989816bf144c7a25f9d7d6046662` replaces533 in all
four manifests and the lock. Its754-file payload digest is
`0ee608f4a7fae6484e2d7a7933a24add3ad5780a5aa9d942c7998daf212ccd60`.
Public Node9/hosted16 entry checks and four demo CMS regenerations passed42s
with no generated diff. Exact install and frozen reinstall passed; installed
mutation/restart/build acceptance is pending. Component contract remains
`c0b452da075b66757c60bd0d721a47062d4354d0`.

All failed-attempt test values and the one inserted local Paragraph were removed
through supported UI/API inverses. The restored public capture is
`361adda71b996f1609a2c8be9e3a69765066c26ffcb1cdc350ae13cc147c0769`.
All Composition documents, Content values/lifecycle, Mapping, Sitemap and public
bytes match the initial stage; original source814files/public142files remain
unchanged. Legitimate history, revisions and receipts remain. This is not a raw
snapshot rollback or an owner-data migration.

[Save blocker, correction and cleanup evidence](https://github.com/zudolab/pinsel/issues/54#issuecomment-6930906534).


### Typed-value handoff correction

The1d7 installed run passed enabled Save and no-autosave checks, but submitted the
old empty text. Composerc4859574 removes capture-phase staging of the old value;
the typed control now supplies the complete draft before notifying observers.
The regression reproduced the failure before the fix. It also verifies textarea
identity, focus and value survive the first input. Composer87b399f0 aligns omitted
numeric steps with the schema (`any`) while retaining explicit step constraints.
28 focused field/host tests and scoped lint passed, with independent review;
invalid-number blur behavior remains unchanged.

Current package: `87b399f0d35e016ad4193238fd2d9f606d7dd59a`,754 shipped files,
payload digest `1e06b7c8213104b5c2aaa853a0af8f3f773185a3be6d7c0f5c853eb34e7d18fb`.
All four manifests, lock and dependency inventory use that exact revision.
Public entry checks and all four CMS regenerations passed39s with no generated
diff. Fresh install/frozen verification is recorded by the current acceptance run.
The final installed local-Save/shared-content/build/restart scenario remains pending.

The failed1d7 run restored all test values and removed its one test node through
supported UI/API operations. Public restored digest:
`10496496f648221c8f4ce9332f84b1f039e62aa15c2dc9563d4ffc31484230ac`.
Original source, Mapping, Sitemap and public assets remained unchanged; legitimate
history and receipts remain. No owner-data switch or deployment occurred.


## T4 installed acceptance — final package87b399f0

The independent installed scenario passed on Pinsel
`4ebdb8da1609b3366ee192d93ebd25e905538cad`, Composer package
`87b399f0d35e016ad4193238fd2d9f606d7dd59a` (source/attestation head
`9a6423e37e5d98618fd34dc0761d5a0fd51f044a`), unchanged contract
`c0b452da075b66757c60bd0d721a47062d4354d0`. Workspace `pinsel`, snapshot schema1,
pack0.3.0, renderer `pinsel-zfb@native-v2`; explicit stage `course-identity-v1`.

The guarded483-second run verified local Paragraph insertion, exact typed value,
zero autosave writes, explicit Save, rendered text and same-UUID reload. Focus
retention was verified separately by the component regression tests.
Shared price appeared on Home and Lessons; Contact label and order changed while
numeric1/2/3 and all three canonical query IDs retained their meanings. Stopping
the editor, capturing through the public API, building that exact capture and
restarting preserved the saved state. All14 routes and143 public-file hashes
matched. Changed snapshot:
`02848464ab29af911808de57dd8e473934d276e82cc4aa4a4451d300dc33cbf3`.

A separate guarded131-second installed test refused an undeclared insert slot
(`component-invalid`) and a shared-value shadow (`unsupported-scope`). Before and
after public snapshots/tokens and all838 canonical files were identical, including
all8 existing receipt files; no receipt was added. Restored snapshot:
`640425ae7b0b900132dd98efcfef2591090e2dc5b8cd2d0714747f0c11b6db40`.

Supported API removal and Content UI inverses restored all test values/documents,
retaining legitimate history and receipts. The original source814files/public142files
remained byte-identical and the test server stopped. Removal was an API inverse;
an everyday Remove button remains T6 work. Earlier wrapper/legacy01 inspection is
still attributed to533, not silently relabeled. Both real inspector failures and
harness failures remain recorded rather than counted as passes.

Evidence: `t4-mutations-1794868111900510442`, `final-t4-stage-1794868121459`,
`t4-negative-1794868625809700220`, and `final-negative-1794868636697` under the Cloud
acceptance evidence directory. `saved-node-audit.json` reads the final saved text;
the creation-time target in the original build proof is explicitly distinguished.
Integration state is tracked in [Pinsel #60](https://github.com/zudolab/pinsel/pull/60)
and [Composer #977](https://github.com/Takazudo/zudo-composer/pull/977).
T5–T7, actual owner-data cutover and authenticated inference remain separate work.

### Final migration inventory review

Independent review found that the final migration source check reused its initial
public-file list, which could omit a newly added file. The course migration now
re-enumerates before each supported source-currentness check and verifies the list
again afterward. A real installed-API regression adds a file between checks,
observes refusal and verifies canonical state remains unchanged. Native-authoring
and course-migration tests passed22 cases; after correcting a helper type error,
the focused regression and Content typecheck passed. No staged data was changed.
This follow-up changes migration tooling, not the accepted renderer or Composer pin.

## T4 integration and next installed candidate

T4 merged as Composer `5f400c7dd3af9225c1d5485ab0b624ec9298a92b`
([#977](https://github.com/Takazudo/zudo-composer/pull/977)) and Pinsel
`ce455399ed3a3f5c4e0de65990a90f70f9a44287`
([#60](https://github.com/zudolab/pinsel/pull/60)). Required premerge CI passed;
Pinsel postmerge run43978590970 passed. Composer postmerge43977935192 remains
under observation at this checkpoint. Both primary checkouts returned to main;
new implementation work is isolated in separate worktrees.

The next candidate is immutable Composer
`5e16a34363a0763a5a8bd852805117ff79e5c2f9`, from
[draft #979](https://github.com/Takazudo/zudo-composer/pull/979), with unchanged
contract `c0b452da075b66757c60bd0d721a47062d4354d0`. All four manifests and lock
use this revision. Its766-file payload digest is
`b8c5758a5ef03940bd2d7de18df89c346bad8d28df33d262b0705678da07442b`.
It adds owner-aware host Assistant review and guarded human removal of local
children. Independent source reviews passed30 T5 tests and20 removal tests;
whole-repository TypeScript and scoped lint passed. Public Node9/hosted16 entries
and all four demo hosts were regenerated and checked. A conservative no-deploy
scan initially mistook a local helper named `run` for a command wrapper; renaming
that helper fixed the scan without changing the guard or locking behavior.
Fourteen service tests passed after the rename; generated output stayed current.

The preceding `0eb2456408b8779f8c64ffd4e27307e962efad9a` consumer install passed18
focused tests and Content typecheck. The final5e16 install passed8.9s, frozen
reinstall450ms and dedupe. Browser acceptance for this candidate is **NOT_RUN** at
this checkpoint; source checks are not a substitute for the installed scenarios.

### Separate Note-route stage

The reviewed migration ran with the previous87b399f0 package against fresh source
`640425ae7b0b900132dd98efcfef2591090e2dc5b8cd2d0714747f0c11b6db40`.
Its explicit `notes-v1` target has pack0.4.0 / renderer `pinsel-zfb@native-v3`,
workspace `pinsel`, snapshot schema1. Snapshot:
`06316fad72e5db58719e8876c2045eb6076ac94e1a73c1042314fa48711f057e`.
The guarded100-second import retained25 models and246 entries, with only the
documented new-store generation reset;23 structural/reference deltas produced179
Compositions,165 Mappings and199 attachments. Original source and course-stage
stores/public bytes remained unchanged, including their recovery history.

The exact staged build passed7s:14 HTML routes and143 public-file hashes matched;
no prepared public bytes changed. Dynamic Note-route, new-page and new-Course
fixtures additionally pass, but their live creation/publication/restart flows
still require browser acceptance. See [the migration recipe](composer-note-migration.md),
[portable acceptance](native-authoring-acceptance.md),
[route-authoring recipe](native-route-acceptance.md), and
[Assistant ownership/configuration](composer-assistant.md).

T5/T6/T7 and human Remove task[978](https://github.com/Takazudo/zudo-composer/issues/978)
remain open. No owner-data cutover, authenticated inference or deployment occurred.

## Boundary repair and installed acceptance retry

Current candidate package is `cafc1e44025e4537da049a63220844f592ed3336`,
Composer attestation source `31be5a5a` (PR979), unchanged contract. Its766-file
payload digest is `bfe902e7bbf14107e5cb94464d9b48b273ac89cb9cdff7672b59f5980de4a325`.
The unchanged headless boundary scan detected a feature-owned type imported by
server plugins. Moving the pure contract to shared types fixes that boundary;
independent review confirmed unchanged runtime semantics. Node/app typechecks,
scoped lint, public9/hosted16 generated checks pass; all four CMS fixtures regenerated.
Required current-head CI and installed scenario acceptance remain pending.

Pinsel `0a96abe` fixed fake provider input through actual public `loadHostContext`
coverage: all four provider shapes plus policy tests (8) and Content typecheck pass.
Two5e16 browser attempts stopped before proposals or Apply: first unsupported fake
config model, then ambiguous select locator. The latter final public capture matched
before `2a797d039c07394fa0b269709d6eb6efcf5e30c46eb2f3818f78586061c2b89f`.
Neither counts as acceptance. Harness `e374b63` fixes scoped locators and asserts exact
post-Apply ownership for Composition and Content;29 pure tests pass. No real-provider
inference, owner-data import, deployment or actual-data authority switch occurred.

## Combined readiness/reference-query candidate — 2026-11-17

Current immutable package `960f2d5661b0d23006fbdfa7d079a7f3683f8362`
(Composer attestation `2f982863`) includes the independently reviewed same-session
readiness fix and qualified reference query editor (task980). The769-file payload
digest is `36f13f27788974220311ac42b57cf63a7bc7b4a36b62bf1a159440a62cb0590f`.
Readiness23 focused tests and reference-query8 independently rerun tests pass,
including actual save/reload and no-write catalog loading. Public entries and
four demo CMS hosts regenerated under guard65s, no generated drift.

Diagnostic cafc evidence confirmed createConversation200 followed by locally
refused read during preview reconciliation. Empty conversation IDs
`conversation-e3f18ac3-6981-4306-b8dd-182de4b542d4` and
`conversation-6bab881b-707b-48e7-80bb-68adf3fc03b3` are retained as history.
No proposal/Apply occurred; canonical before/after capture matched
`ba5abfa45099d70e3e12fab7361828fcdefbba5662fa982caa661571a4b6ef8b`.
The bounded T6 draft pilot also stopped before any create due cold Content loading;
its final public capture matched exactly. Direct-route timing diagnosis is pending.
Pinsel CI43982372029 and43982363948 passed at a8b0b68/cafc; those passes are not
attributed to this new candidate. Installed browser acceptance and current-head CI
remain pending. Pinsel bb19d6a guards all initialization destinations before writes;
5 filesystem tests and Content typecheck pass. Corrected bootstrap/manual recipes
were documented; cold-operator execution was still NOT_RUN at this checkpoint.
The later evidence below records its actual result and package identity.

## Live-lease and host navigation candidate

Current package `1af202393e9d1510aee87f17dbc09ea49d59ea44`, Composer attestation
`784fe903`, includes actual HTTP host-review lease correction (`a29d1d16`) and
qualified host preview/Sitemap handoff (`1f5d59f2`). Its773-file digest is
`beb3378905528d1746d4aab7cf6a87659dccabfc89d5e83c60cc018519c32f3c`.
Independent15 service tests,45 navigation/selection tests, full typechecks and
scoped lint pass. Combined public/CMS regeneration, no-deploy and headless boundary
checks passed under guard74s without generated drift. Installed Assistant and
navigation acceptance were pending at this checkpoint; later scoped results follow.

At previous960 package, actual fake Course proposal completed with correct shared
owner and Home/Lessons uses, but Apply was unavailable because currentness read
incorrectly lacked the live server lease. No canonical mutation; exact capture
`15c0af11308e0dfeb836e39ec9d5bf5e8cf2757821abac4dedfb70bbe2571a32` restored.
Conversation/run/capability/proposal/review metadata are retained, not erased.

Independent cold operator at Pinsel b4b83c3/960 completed frozen install, fresh
known-data initialization, local Paragraph insertion/no-autosave/Save/reload, exact
capture/build, restart and real UI removal. Saved digest
`fab1af556585a8c59b5773521da801e18b952ec63a44efc834ff54a7cae3da75` produced
all14 baseline routes and exact saved text. Canonical documents/Content/assets
restored; only expected Lessons timestamp, Composition token and digest differ.
See [independent evidence](https://github.com/zudolab/pinsel/issues/56#issuecomment-6933719174).
That operator found the Sitemap handoff gap now addressed upstream; it was not
counted as passed. Receipt-body recovery, per-asset hash proof, later-B/exact-A and
new-page/publication scenarios remain separate. Previous source CI43984291031
(Composer2f982863) and43984498706/43984490522 (Pinselb4b83c3) passed; newer-head
gates are pending. No deployment, owner-data cutover or authenticated inference.


## Independent operator and partial Assistant evidence — 2026-11-17

These are scoped results at recorded pins, not acceptance of a later package or
completion of T5/T6/T7. Contract remains
`c0b452da075b66757c60bd0d721a47062d4354d0`; both operator runs use workspace
`pinsel`, snapshot schema 1 / Composition schema 2, pack `pinsel@0.4.0`,
renderer `pinsel-zfb@native-v3`, explicit `notes-v1`, Node 24.19.0 / pnpm 11.5.2.

At Pinsel `b4b83c301ae72f56e8e59b31ae5ed68e9e74fb71` / Composer
`960f2d5661b0d23006fbdfa7d079a7f3683f8362`, the independent operator's frozen
install, dedupe, Chromium preparation, six proof tests, seed/assets checks and
fresh initialization passed (179 compositions / 246 records). The previously
recorded Paragraph save/build/restart/removal proof remains attributed to this
pin. It used a disclosed Page-selector workaround; the original Sitemap handoff
failed. Receipt response bodies were unavailable across browser navigation,
so no complete receipt-body recovery claim is made. Per-asset hash verification
and later-B/exact-A were not part of this manual run.

At Pinsel `81affe70ccaba458656b827a09b8b530be41ae4a` / Composer
`1af202393e9d1510aee87f17dbc09ea49d59ea44`, fresh frozen install/dedupe and the
revised Sitemaps → Main → Lessons → Open page authoring recipe passed without a
workaround, resolving `files/lessons/frame` in the real rendered Lessons page.
The rail and Review & release saved-preview links opened the actual saved host
renderer in new tabs. Legacy `/website-preview` directed to it; `/site` and
`/site/lessons` explicitly refused activated-release preview instead of substituting
current saved output. No release was activated. Before/after capture was byte-identical,
digest `f24c649fd281eeb6f43e165dc5c08630052fc7e7091cc162aef5fc9b2e435068`.
An initial popup showed Preview not current during concurrent original-tab navigation;
Refresh saved page recovered it and an isolated popup passed. Root cause remains
unestablished and needs a focused regression. This navigation-only pass is not a
new-pin Paragraph mutation pass. Owned browsers/servers stopped; restored native
history, captures and builds remain preserved in the clean detached consumer.

The fake-provider Assistant run `t5-installed-assistant-1794881706`, package
`1af202393e9d1510aee87f17dbc09ea49d59ea44`, completed Course and FAQ proposal,
Apply and Undo phases. Course's retained Apply recovered the identical operation
and receipt with `recovered: true` after response loss. Actual Content receipts
identify `course/consultation` and `faq-item/faq-exam-01`; supported Undo receipts
and public captures remain in the journal. The run then failed before Note proposal:
`No rendered bound target for note-body`. Its aggregate result remains **FAIL**;
completed subsets do not pass Note, local field/insertion, stale Apply or guarded
Undo. The later restore phases passed; history and failed-attempt evidence remain.
This fixture is not authenticated model inference.

Evidence under the Cloud acceptance root `composer-adoption-notes`:
`cold-operator-20261117/report.md`, `cold-navigation-81affe7/report.md`, and
`t5-installed-assistant-1794881706/{run-manifest.json,result-1794877387952.json,assistant-course.json,assistant-faq.json}`,
with captures, command journals and screenshots alongside. Earlier failures remain
historical failures. Remaining full-suite, route creation/publication, current-head
CI/review and integration gates stay open; actual owner-data import/cutover and
new real-provider acceptance remain held. No deployment occurred.

## Direct Sitemap Mapping ownership candidate

Package `3c30d18a13455b6adb51378c3cf957ecff186b1d`, attested by Composer
`80ae570706904e46cac75ec5804068077a01db20`, carries the qualified direct-route
Mapping fix from `5e79f11b` ([upstream982](https://github.com/Takazudo/zudo-composer/issues/982)).
Its773-file packed digest is
`b8bfcd5c6966f7796088112977e591587c6f4587b3d7288705efd0c6192483d4`.
The host target now retains the compiler's selected Content entry only for its
actual local Composition owner; nested materialization overrides and linked Global
boundaries remain intact. Worker and independent reviewer each passed29 focused
tests, including a dynamic Markdown route's staged proposal, Content Apply and Undo.
Typecheck, scoped lint, public/CMS regeneration/check63s, no-deploy and headless
boundary checks pass. Installed Note and remaining Assistant acceptance is pending.
The Note recipe explicitly selects the Prose presentation, since its TOC also uses
the same body. No owner-data import or authenticated inference is implied.

The first cold Content timing diagnostic was invalid: its test request filter
blocked the read-only initialize operation. It stopped without canonical writes;
before/after coherent capture remained exactly
`afbaa4d849e75c5c7cc89d1bba1f1748ed2bc9313bff1d9e2530687d06b1c47e`.
A corrected diagnostic remains required; this is not evidence of a product deadlock.


## Installed Note ownership: Apply and restoration observed; run failed

The `t5-note-remaining-1794881907` run used immutable Composer
`3c30d18a13455b6adb51378c3cf957ecff186b1d`, workspace `pinsel`, explicit `notes-v1`,
snapshot schema 1 / Composition schema 2, pack `pinsel@0.4.0` and renderer
`pinsel-zfb@native-v3`. Its actual selected Prose target was
`files/note-detail/note-prose`, with qualified Content provenance
`content-filesystem/note/exam-schedule`, property `markdown` → `note-body`.
This addresses the earlier missing-bound-target observation at package `1af2023`;
it does not turn that earlier failed run into a pass.

Fake-provider proposal completed. Before/proposed public captures had the identical
digest `5c8dd6337880a27ccc79a4d82e178a1ac7524728cdd3306b83edc73ccdd28633`.
The real candidate route rendered the marker before Apply; its acknowledgement
bound `/notes/exam-schedule`, the exact renderer and candidate digest
`f8515175a2aa352f5374c9abf1e4fd1d18ac395c5159f0bf01095b1000ae3cdb`.
Actual Apply returned HTTP 200 with Content receipt revision
`ecd73c90-0f59-44fe-b3e6-996031a77b51` for `note/exam-schedule`.
The subsequent browser navigation to the saved Note route timed out waiting for
load. This is a post-Apply navigation failure, not a refused Apply or missing
provenance. The helper's completion/navigation race is being corrected; no retry
pass is claimed. Saved-route verification and the complete Assistant run remain
**FAIL/incomplete**, including remaining local and conflict scenarios.

Supported cleanup Undo returned HTTP 200, revision
`2a96c3c6-5778-45fb-9da1-6b310cfafaa0`, for the same qualified entry.
The restore phase passed and `restoration-proof.json` records canonical values
restored with legitimate metadata/history retained. Final public digest:
`eb4ae3dc74c5498bf8d11d63f672b031d110da4d42c2efc60842e108b0a8b62a`.
Evidence stays under `composer-adoption-notes/t5-note-remaining-1794881907`:
`assistant-note.json`, phase `evidence.json` files, captures, restoration proof and
aggregate `result-1794878439868.json` (**FAIL**). No live inference, owner-data
cutover, deployment or new T5/T6/T7 completion claim follows from this subset.

Pinsel source `34ee23bace32aabd6c36ce3998bffaa39266d8ca` CI runs
[43993978604](https://github.com/zudolab/pinsel/actions/runs/43993978604) and
[43993970909](https://github.com/zudolab/pinsel/actions/runs/43993970909) both passed.
Those checks do not attest later helper changes. Composer source
`80ae570706904e46cac75ec5804068077a01db20` validation remains pending at this
checkpoint; source gates and installed end-to-end acceptance remain distinct.

Corrected cold Content inspection at the same3c30 package / Pinsel34ee23b passed
under guard144s: the Note library's New Entry control became visible and enabled
between30 and60seconds. All210 completed requests succeeded; three background reads
were pending when the read-only browser closed. The213 observed requests included
25 count-entries calls (median16.685s),70 get-model calls and44 scan-entries calls.
This proves progressing but slow loading, not a stalled transport. Both coherent
captures matched digest17725aa5bdb7adb67c79240fb096704f46c017247bdf8595cce9c7b0d3e8b257;
all808 native and143 public files remained byte-identical. Server4194 stopped;
the detached known-data consumer and its history remain preserved. Evidence:
`composer-adoption-notes/t6-cold-content-3c30-1/OUTCOME.md` and `request-summary.json`.

## Batched Content initialization candidate

Package `62f014f4ae5acfa10ca551c116be6e3a909310fe`, attested by Composer
`6a28dc8d698039c413da0b41773fdf95341cc319`, includes
[983](https://github.com/Takazudo/zudo-composer/issues/983): Content initialization
reads one coherent snapshot instead of separate per-model counts, descriptions and
completeness scans. Later editing retains fresh reads; no cache, schema, storage or
write-authority change is introduced. Semantic-invalid completeness remains unknown.
Its773-file digest is
`b08a99a3a4bb8c40ef315480891a2748409b12dc9245b61bb47f86326dbcfee9`.
All192 Content tests, typecheck/lint and independent55-test review passed. Guarded
public/CMS generation/check passed64s without generated drift; stopped-delivery and
headless guards pass. Installed cold-start comparison and final-pin acceptance are
pending; no latency improvement is claimed yet.

The preceding3c30 run at Pinsel210e762 completed Note and local-field cases,
including qualified ownership, proposal without canonical mutation, exact candidate,
Apply, saved output, strict owning-domain delta and Undo. Local fixture removal also
passed. AI insertion passed proposal, Apply, saved output and exact Composition
change, then the aggregate guard hit its default1800s runtime limit as Undo started.
That aggregate remains **ENV_SUSPECT**, not an assertion failure or complete pass.
After confirming the original processes had stopped, recovery retained the journal,
used the existing guarded Undo (no reapplication), and passed164s. Final public
capture `9ecd27ad21308fcba54c01a4b11c6b0d0d8f5c5bed2ac8a4994e9f790065406c`
restored all authored values/domains/assets/public against the original capture;
only receipt-authorized Note generation9→11 and normal revision metadata/history
remain. Ports4173/4194 closed and the stale owned lease was removed only after its
PID and processes were verified absent. Stale Apply and guarded-Undo cases remain
pending at the new pin. Evidence: `t5-note-remaining-1794882108/restoration-proof.json`
and `t5-insertion-recovery.log` under the Cloud acceptance root.

The final complete seven-case run uses the guard's documented bounded
`--max-run 5400` option, based on measured aggregate duration, while retaining the
single-run/memory gates and every browser/operation assertion timeout. This does not
turn earlier interrupted runs into passes. Actual owner-data and provider holds,
required current-head checks and integration remain open.

Installed62f cold verification passed at Pinsel269e0cc under guard137s, using the
same read-only diagnostic as the preceding3c30 run. Total requests decreased
213→161 and count-entries25→0; one read-all took20.3s. get-model decreased70→49
and scan-entries44→26. New Entry readiness remained greater than30s and at most60s
under the same samples, so **no load-time improvement is established**. This is
verified read reduction with no observed functional regression; remaining startup
work still matters. Zero errors or blocked canonical writes occurred; two background
reads were pending at deliberate browser close. Before/after capture matched
`14506cec69367421b10068b48f977525203a5977a2d478d2f522a4e8e5e56059`, and
all808 native plus143 public files were unchanged. Port4194 closed and the detached
consumer remained clean. Evidence: `t6-cold-content-62f-1/OUTCOME.md` under the Cloud
acceptance root. Whole-route creation and final Assistant gates remain pending.

## Current acceptance checkpoint — aa8a096 / package 62f014f4

This checkpoint records Pinsel `aa8a096970ea5efc24354c80a3ceb133660cbce3`,
Composer package `62f014f4ae5acfa10ca551c116be6e3a909310fe`, unchanged contract
`c0b452da075b66757c60bd0d721a47062d4354d0`, workspace `pinsel`, snapshot schema 1 /
Composition schema 2, pack `pinsel@0.4.0`, renderer `pinsel-zfb@native-v3` and
explicit `notes-v1`. Main and detached cold-consumer stages are separate stores.
Tracking remains [T5](https://github.com/Takazudo/zudo-composer/issues/973),
[T6](https://github.com/zudolab/pinsel/issues/55),
[T7](https://github.com/zudolab/pinsel/issues/56) and
[the integration epic](https://github.com/zudolab/pinsel/issues/51).

Composer source `09f476ec6d78ecc50c8d526723b25f07dd3a3408` fixes only excluded
browser-harness restart files: park the same tab before stopping the dev server,
then reopen its exact URL, avoiding competing Vite HMR and harness reloads.
Four unit tests, typecheck, scoped lint, syntax and independent review passed.
The full required Assistant browser lane passed under the shared guard in 440s,
including both restart journeys and the unchanged recovery/Apply/Undo assertions.
The shipped 773-file payload remains byte-identical to package `62f014f4`, digest
`b08a99a3a4bb8c40ef315480891a2748409b12dc9245b61bb47f86326dbcfee9`;
no runtime repin is implied. Fresh source CI
[44006129670](https://github.com/Takazudo/zudo-composer/actions/runs/44006129670)
was **in progress** when checked. Earlier failed CI remains failed; the local lane
is not Pinsel's complete installed seven-case acceptance. Evidence:
`composer-adoption-notes/assistant-restart-harness-fix.md` and
`composer-assistant-restart-fix-full.log`.

Main consumer `t5-62f-stale-1` completed the stale-case proposal with unchanged
canonical state, but neither attempted segment completed human intervention or
stale Apply refusal. The first failed before a human Save because the required
price-label marker was omitted; aa8a096 corrects that locator. The resume failed
with `Human Save was interrupted before dispatch`; its uncertain-attempt journal
correctly held all automatic inverses. A separate read-only reconciliation found
exact before/after public capture equality at
`0771240d389d016752db0576b647dbad9fd26bc7e468ec0ca48f64b3266707f3`, without rewriting
the journal or counting the attempt as a successful save. Both aggregate results
remain **FAIL**. The blocked-request diagnostic was queued behind the cold pilot
at this checkpoint; its trace is not yet a pass. Evidence:
`t5-62f-stale-1/{result-1794883157461.json,result-1794883994010.json,uncertain-attempt-readonly-reconciliation.json}`
and `t5-content-blocked-trace-1.log` under the same acceptance root.

The separate cold `t6-cold-drafts-62f-2` pilot is **ACTIVE/incomplete**, not restored.
It created Note `content-entry-7ccd88dd-dd45-440f-83d7-c44abfdca113` through the
original browser transport. Earlier required-label, toggle and external-regex
failures remain recorded. The uncertain slug save was reconciled through public
capture `29a79cd2ed0df8c029d56d75355526a5a4fda8d1471ddf3319cb5392037bdf38`:
only the journaled new draft changed, to generation 3 with slug
`pilot-1794882566531`; original project/assets/public files were preserved.
That capture is a prior recovery boundary, not a claim about the active store now.
The resumed journal subsequently records HTTP 200 field-save responses through
03:01:51 UTC on 2026-11-17. A final coherent capture, saved-field/reload proof,
Course creation and complete two-draft acceptance are still required. Preserve
the existing Note ID, journals and native history; do not recreate it, infer
restoration, or start another writer. Evidence: `t6-cold-drafts-62f-2/routes-journal.json`
and its captures; the earlier `OUTCOME.md` describes a prior partial boundary.

The complete installed seven-case Assistant matrix, remaining T6 creation,
publication/hierarchy/family workflows, exact-build scenarios, T7 final-pin gates,
review and eligible integration remain open. The upstream scripted-provider pass
and consumer subsets do not complete those gates. Owner-data import/cutover and
new authenticated-provider acceptance remain held; no deployment is authorized.


## Explicit boolean package — installed acceptance pending

The next immutable package is `bc20ea554d5d8de92934c9bf4ec989229d23047e`,
attested by Composer source `ed909729c8abb3ddce02071f09e3762785fbe1a4`:
774 shipped files, payload digest
`64715b845ac03cc22b11569168219527c273889b58d8d94762c0c42060482175`.
Contract `c0b452da075b66757c60bd0d721a47062d4354d0`, Pinsel pack/schema/renderer
and ZFB 5.1.5 remain unchanged. All four consumer manifests and the lockfile use
this exact package. [Composer #984](https://github.com/Takazudo/zudo-composer/issues/984)
adds explicit unset boolean presentation and one deliberate Set to No operation,
without defaults or mount-time writes. Top-level, nested and hosted controls share
that behavior. Source tests/typecheck/lint and independent review passed. Public
build initially failed because the UI barrel pulled CSS into hosted declarations;
direct imports of the same controls fixed that boundary without relaxing the gate.
Public builds, four-host CMS regeneration/check and public consistency passed
under the shared guard in 134s. Fresh current-head CI and installed missing-to-false
Pinsel acceptance remain pending; earlier 09f476 CI passed separately.

The prior package62f cold two-draft slice passed: Note
`content-entry-7ccd88dd-dd45-440f-83d7-c44abfdca113` and Course
`content-entry-40369930-3eb7-4739-994f-ab82e3de7069` saved/reloaded, original project
and assets remained exact, and both drafts were retained unpublished. Capture:
`12f76c229fbd4945929feb16b46fc1270b3019af5e5385ab12e5cb3efac334fe`.
[Recorded acceptance](https://github.com/zudolab/pinsel/issues/55#issuecomment-6936952733)
does not prove the new false operation or publication.

The reconciled stale segment on package62f failed its exact refusal-code assertion:
it received approval-mismatch because server restarts discard in-memory candidate
acknowledgements before the stale-revision check. This is not a stale-plan pass.
Its verified human edit and inverse restored all authored values/assets, retaining
only authorized Course generation/history changes. Final capture:
`4d0a26dd17aff9117ea8ecb68f5e647e159a4c18437d318effabbddc0920962d`.
The corrected fixture keeps candidate acknowledgement, intervention and refusal
in one server process, preserving the original failure evidence. Full final-pin
Assistant, route, exact-build, recovery and independent operator gates remain open.


## bc20 stale Apply and guarded Undo passed

At Pinsel `198065a4b8c3c872a2846bf23ed3710df068c7d2` and installed Composer
`bc20ea554d5d8de92934c9bf4ec989229d23047e`, two bounded fake-provider runs passed:

- `t5-bc20-stale-1` passed in 394s. Candidate acknowledgement, verified human
  intervention and retained Apply stayed in the same server process. Apply refused
  with exactly `stale-plan`; before/after coherent preview identities matched
  revision `89bea1b42d81c342c3a6d6abcb577bb0b10136bf9e68733f4d31dbe74717a172`.
  The verified human inverse restored canonical values/assets/public files, allowing
  only the journal-authorized Consultation generation 13→15 and normal history.
  Restored capture: `85489d757d114468c8ca97380e325e8abf108d4aaf4395da6a43c88dce3ee1e5`.
- `t5-bc20-guard-1` passed in 637s. Actual Content Apply succeeded, a verified human
  edit intervened, and Undo refused with exactly `revision-conflict`. The complete
  intervened/refused public captures were identical at
  `3f76983bfa4ace1c941df93bdd78c8718895cdf9ebf37d8e4929c35a11c93d92`.
  The supported human inverse restored canonical values/assets/public files,
  allowing only authorized Consultation generation 15→18 and normal history.
  Final main-stage capture: `07c868518c836e9bd3c00234e62434f46e2f91b07f163c0a7a8bdde5e75ecae5`.

Each directory under `composer-adoption-notes` contains its actual result,
qualified Course journal, `generation-audit-*.json`, public captures and
`restoration-proof.json`. Results are bounded-case PASS, not the full seven-case
matrix; the earlier `approval-mismatch` and harness failures remain failures.
See [the stale-case checkpoint](https://github.com/Takazudo/zudo-composer/issues/973#issuecomment-6937431094).
Main-stage work is restored and idle at this boundary.

Live CI refresh confirmed Pinsel source 198 passed
[44010519009](https://github.com/zudolab/pinsel/actions/runs/44010519009) and
[44010511342](https://github.com/zudolab/pinsel/actions/runs/44010511342), and Composer
attestation source ed909 passed
[44010339167](https://github.com/Takazudo/zudo-composer/actions/runs/44010339167).
These source checks do not replace installed scenario acceptance or merge review.

The separately installed cold consumer retains its two known unpublished drafts
at the bc20 installation-bridge capture
`e919a7ab7dd4dbb7c204a3e1c884d3cef672ad6e80baed7cc2cf56603ffdad8e`.
That bridge preserves authored project/tokens/assets/public files; only attested
runtime graph digests change. The third missing-to-false fixture is queued behind
the independent final operator on its own port 4196. Neither the false fixture,
publication nor the final operator is counted as passed at this checkpoint.
The third fixture must remain excluded from any first publication selection.
Full seven-case, remaining T6 routes/publication/hierarchy/family work, final-pin
exact-build/recovery and T7 integration gates remain open. No owner-data cutover,
new authenticated inference or deployment occurred.


## bc20 complete seven-case Assistant acceptance

The normal unfiltered runner at Pinsel `f07e05b8f9e22379cb321bf80a11d47b26800e24`
and immutable Composer `bc20ea554d5d8de92934c9bf4ec989229d23047e` passed all seven
cases in 3,019 seconds under the shared heavy guard (5,400-second bound):

- Shared Course pricing, including deliberately lost Apply response and exact-receipt
  recovery in a fresh browser; FAQ and Note Content edits.
- Local component field editing and supported removal; allowed-slot insertion.
- Exact stale-Apply refusal and conflicting Undo refusal without canonical writes.

Each positive case checked no canonical mutation before Apply, actual Pinsel candidate
rendering, exact owning-domain changes and supported Undo. Aggregate cleanup also
passed. Result `t7-bc20-assistant-1/result-1794892244743.json` records `PASS`,
`restorationOnly: false` and no errors. The final public capture
`db31ddcbbd942e86af2c0d3b903b6f7365deb974adab8b4a9b65e4b049914e48`
restores the authored values/assets from baseline
`07c868518c836e9bd3c00234e62434f46e2f91b07f163c0a7a8bdde5e75ecae5`.
Only receipt-authorized Content generations (Course 18→29, FAQ 7→22, Note 11→24)
and normal revision metadata/history remain. The restoration and generation audits,
per-case captures/journals/screenshots and terminal audit are retained beside that
result. The checkout was clean, port 4173 closed and its server/lease absent at the
completed boundary. This is fake-provider integration, not authenticated inference.

The reviewed URL/workspace acceptance guards (`2f0dbd2`) and explicit native model
metadata projection (`be967371`) were integrated afterward at `04ccd860a99c80cb61f60d7d33a267c10ad45346`.
They did not run during the frozen acceptance. Existing staged data was not reseeded
or migrated by that source merge. Composer [985](https://github.com/Takazudo/zudo-composer/issues/985)
separately corrects human shared-field source/affected-use presentation; its later
immutable package needs its own installed checks. This bc20 result is not relabeled
as a future-package pass. T6 publication/new-route/hierarchy/family/visitor scenarios,
T7 exact A-after-B/negative/recovery and current-head integration remain open.


## Shared-field inspector package candidate

Immutable package `4f1191d682995438380fccdb5bb692a299415402`, attested by Composer
`75df80f75c0a34f99bcc8cbd02447fd47ddc70a9`, contains 775 shipped files with digest
`1e560f9a452504010483e8b5fa79d332e6b2b1ab9678d9020ca28d1e70e36e44`.
Contract and Pinsel pack/schema/renderer versions remain unchanged. All four
consumer manifests and the generated lockfile use this exact package.

[Composer #985](https://github.com/Takazudo/zudo-composer/issues/985) adds captured
per-field Content source and affected-page information to the human Inspector,
separately labeling arrangement-owner uses. It extracts the existing Mapping
provenance lookup without changing Assistant policy, Apply/Undo or write behavior.
A pending local draft hides the new source navigation until Save/Discard.
Twenty focused source tests, Node/app type checks, lint and independent review
passed; the follow-up Inspector regression suite passed nine tests. Public/CMS
regeneration/check and public consistency passed under the shared guard in 90s.
No demo inventory changes were needed; generated authoring types were committed.

The new package's installed human provenance/unsupported-request checks passed in
165s on Pinsel `dea458747b8445eae4ebf852f495257b941a8997`. Human Course price
shows Home and Lessons uses separately from local arrangement. The exact saved
price proposal was recovered through public events; broad-scope and disallowed
Contact requests explicitly refused. Before/after public captures both equal
`6fc68557f08920f3ded83c68c904f53e61c365c90cbbf5119e6721dd6ddecf66`.
This is canonical-read-only acceptance: derived JSX repairs may write files.
Composer CI [44022755564](https://github.com/Takazudo/zudo-composer/actions/runs/44022755564)
reported all 26 jobs successful at the attested head. Pinsel pin CI
[44023187292](https://github.com/zudolab/pinsel/actions/runs/44023187292) passed.
Later integration heads still require their own gates. The prior complete bc20 matrix remains valid
historical evidence for its own exact pin, not a claimed full-matrix pass at this
revision. The separate cold creation/publication workspace remains on bc20 until
its serialized acceptance boundary; no existing authored state was reseeded.


## Canonical shared-source staged rehearsal

The [explicit staged migration](canonical-shared-sources.md) passed in 137s at
Pinsel `00bb369e5f7a4ce0c7c262ae65bc5bc1fa932e9f` and package `4f1191d682995438380fccdb5bb692a299415402`.
It pins 56 Mapping queries to five declared owners and recognizes three exact
historical model descriptions. Extra Content records remain permitted and unused;
this is not a duplicate-create prohibition.

Source `6fc68557f08920f3ded83c68c904f53e61c365c90cbbf5119e6721dd6ddecf66`
and staged `6a0f5d54b16f7fdca6cdb37f0d3f9ecdbff83dedc45641d66378f600b4426034`
produced byte-identical HTML for all 14 routes and identical bytes/hashes for all
143 public files. Full project preservation allows only the declared pins, exact
descriptions and new-store generation reset (Course29→1, FAQ22→1, Note24→1).
Assets were preserved; both captures stayed unchanged through builds. Original
source authority/history remain retained, and authority was not switched. The
first failed stage (missing one historical description alias) was retained; the
corrected second run used a new pristine target.

Browser owner selection and invalid-pin release-plan refusal subsequently passed
(see below); actual unused-extra-record creation/deletion remains pending. This rehearsal uses known fixtures, not the owner's
current local database. Evidence is recorded in [T6 #55](https://github.com/zudolab/pinsel/issues/55#issuecomment-6939829800).


## First native publication and production visitor acceptance

Cold Pinsel `198065a4b8c3c872a2846bf23ed3710df068c7d2` with package
`bc20ea554d5d8de92934c9bf4ec989229d23047e` passed the actual UI release
plan/stage/build/activate/reconcile sequence in 116s. Only the intended newly
authored Note and Course became published; the third complete Course with
`featured=false` stayed draft. Canonical capture changed from
`530e2f6a56c4aa6d70d50cd60e39392475b62d599d4f69d863538e923ea1a848` to
`ae57baef30bb6d52e6dbd16b017130a2e42df51548eb6979e095dcfe7ce78146`;
only the two authorized lifecycle/generation changes and Content token changed.
Earlier harness attempts failed before forwarding Plan/Apply and are retained.

Pinsel's exact captured static build and visitor checks then passed in 17s:
15 routes (14 baseline plus the new Note), all 143 public files, route metadata,
canonical/noindex output, internal links/fragments and duplicate IDs. Mobile menu
Escape/focus, FAQ keyboard interaction, Note TOC focus and invalid-only Contact
validation passed. The new Course appears in Home pricing with distinct excerpts
and its stable Contact identity; legacy course aliases retain their meanings.
Lessons remains intentionally curated by its pinned membership. The excluded
draft does not appear. No inquiry was delivered. Full capture after visitor
checks remained exactly `ae57baef…`.

The Note renderer supports its documented limited syntax: the fixture's `# Live
heading` is literal paragraph text, while `## Second heading` becomes a heading
and TOC entry. This result does not prove arbitrary Markdown support or parity
between native human-write and Assistant Markdown-policy validation. That parity
is under investigation. New static page creation/hierarchy/navigation and family
reference scenarios remain pending.


## Canonical owner inspection and release refusal

At Pinsel `00bb369e5f7a4ce0c7c262ae65bc5bc1fa932e9f` / Composer
`4f1191d682995438380fccdb5bb692a299415402`, the installed compiler passed
20 explicitly synthetic cases: all five missing/unpublished owner variants failed
with pin diagnostics; extra draft/published variants left complete rendered routes
unchanged. These are candidate fixtures, not persisted captures.

The browser then passed in 245s: five actual rendered selections resolved their
qualified canonical Content sources, and five initial release selections omitting
one owner each produced blocking pin diagnostics with Approve and Apply disabled.
Actual release requests were list/plan only. Before/after complete captures stayed
`6a0f5d54b16f7fdca6cdb37f0d3f9ecdbff83dedc45641d66378f600b4426034`.
The evidence contains 1,110 valid JSONL records and ten screenshots. Earlier
failed harness evidence remains retained: overlapping log writes and selection-order
comparison errors were fixed without changing product behavior or canonical data.
Actual extra-record creation/deletion remains separate pending acceptance.

## Retained value-policy gap

[Composer #986](https://github.com/Takazudo/zudo-composer/issues/986) tracks the
observed native human and native Assistant bypass of Pinsel's legacy field-value
validation. The shared host validator, source/review identity binding and actual
Assistant field guidance are being implemented. The consumer adapter's 47 focused
tests include all retained fields of 246 committed records, but its installed
acceptance requires the forthcoming immutable package. Existing historical data
and release bytes must remain readable and preserved; new invalid changes and
publications must refuse. No existing result is relabeled as a pass of that policy.


## Trusted native value-policy package candidate

Composer source `b4e5e464c72245e9f1ab37ac7ddc23f4016a9150` plus field-guidance
source `9df0d84027a2127341780f93e48b88e47da17970` were independently reviewed
and integrated at `89b14d0ad20adf276cd995c8cc89f72e678229bc`. The integrated
nine-suite run passed 72 tests. Public/CMS regeneration and consistency checks
passed under the shared guard in 96s; all 16 regenerated CMS metadata files changed
only their mutation tokens, with authored records unchanged. Public type checks passed.

Immutable package `71126775a97feab004145dde63a768684e8e3cd9` contains 778 shipped
files with payload digest `57b1e88911c471d5c59a7cd105a630cb12d9afa4c3c0ed09eeb81de4aed74906`,
attested by `f36f52ec4010eb2b97d0939e90e0cd631d97a9bd`. Pinsel's four manifests
and generated lockfile use that exact package; the component contract remains
`c0b452da075b66757c60bd0d721a47062d4354d0`. Installation passed in 9s, followed
by frozen installation, dedupe and no-deploy checks. Installed adapter/config tests
passed 55 cases and the Content package typecheck passed.

Pinsel wires [the shared value contract](native-content-validation.md) independently
of Assistant enablement and supplies Note rules through actual selected-field
Assistant guidance. Before/after installation captures preserve the entire project,
tokens, Assets and public bytes: `6fc68557…` →
`ee5f1dac5cd190272484a16e1730777cb70906963ab96dcb6091d64db854125a`.
Only the enclosing digest, attested pack/renderer digests and release-compiler
identity changed. No source authority was switched or data migrated.

Installed invalid-human/AI/publication refusals, supported Apply/Undo and final
current-pin scenarios remain pending. Source tests and package installation are
not completion of those checks. Composer CI run44030617593 finished with 25 jobs
passing and validation failing on resolved-config/test TypeScript contracts.
The original required-key assertion remains intact; source correction and a new
declaration package are pending integration. Pinsel CI run44031065105 passed all
four jobs.

## 711 normal human-authoring acceptance

Pinsel `6b0e683a27a4b34c6fe9537e273e13887f9210aa`, independently frozen-installed
with Composer `71126775a97feab004145dde63a768684e8e3cd9`, passed the normal,
unfiltered `--scenario full` in 890 seconds. This was not a restoration-only run:
`result-1794897881969.json` records `PASS`, `restorationOnly: false`, and no errors.
The existing canonical migration stage was preserved, not reimported.

Sitemap/page selection, stable component identities, nested local insertion/save,
shared Course price on Home and Lessons, Contact option labels, reordered Course
selection with retained numeric aliases, and reload/restart passed. Reviewed
snapshot A `2558d55818cd019d99a22727b5d16adc682d471df0fc42b06596f6e1bce6ab14`
built all 14 baseline routes and 143 public files after a later edit produced B;
the complete capture after that build remained B. Guarded inverse operations
restored all authored values/assets. Course generation advanced from 1 to 7 for
six receipt-evidenced human commits; normal timestamps/history remain. Final
capture is `05f66c5f1c6ce05df79a3808d71f6370aa335cec1b7406327da4667a35f539a3`.

Evidence is retained under `t7-711-full-1`, including request journals, per-phase
captures/screenshots, exact-build proof and restoration audit. The acceptance
checkout was clean, port 4197 closed, and its lease absent at completion. This
pass belongs to package 711; the declaration correction, negative/recovery cases,
policy-specific acceptance and remaining T6 scenarios are separate work.

## Resolved-config declaration correction

Composer source `b7453de4bacdac3477927cca0324e57a097a1704` preserves the original
all-required resolved-config contract: an omitted authored Content policy resolves
to an own property with value `undefined`. The authored option remains optional.
The full typecheck passed, including the original invariant; two focused config
and nine ownership tests passed. Public generation/checks passed in 31s/29s.

Package `6522f2c78fd59744b56d1717bb93f68d2bddc255`, attested by
`17579d3cbf6c405c900087cae14bf50e676b898a`, contains 778 files with payload digest
`882444ae528ff7530a90d93c13f15da919cdd12421bd60b9acc4ae108837cebb`.
A complete payload comparison with 711 finds exactly five changed files: the
single TypeScript resolved-property declaration and its four public declaration
outputs. Every other shipped file is byte/mode-identical. This does not relabel
711's browser run as a new-pin run.

All four Pinsel manifests and the generated lockfile use 6522; install passed in
13.3s, followed by frozen install, dedupe and no-deploy checks. Public capture
`ee5f1dac…` → `6ffa4a5dc0a6a493c33b753d39b6ee43e8d0f959fd2a398ffce740ed73e374c0`
changes only the enclosing digest and pack/renderer digests. All other capture
fields, including compiler identity, authored data/tokens and Assets, are exact.
Independent policy and recovery acceptance remains pending on this candidate.

The [portable Header/Knowledge recipe](native-header-acceptance.md) is integrated
with 27 focused tests and independent source review; its browser forward/inverse
scenarios remain NOT_RUN. Separately, ordinary new Sitemap child creation exposed
[Composer #987](https://github.com/Takazudo/zudo-composer/issues/987): capture and
normal restart reject a saved unassigned page. The acknowledged child and failed
proofs are preserved; no blind replay/inverse or next write was performed. That
scenario remains held for a narrow generic capture fix and installed recovery.

## 6522 negative authoring acceptance

The committed negative runner at Pinsel `e63fd237d6026eeb319702dc65aba4b2e48da389`
and Composer `6522f2c78fd59744b56d1717bb93f68d2bddc255` passed all seven cases in
296 seconds. Every case observed its intended semantic refusal, not merely a
busy response. Full public captures before/after are exactly
`4dc6fe0bc4f1bf12f2e56ddd8a02793006609b451aabd11d21eaa2f71cba6215`.
The receipt-inclusive audit compared 816 store files and found no changes.
Evidence is retained in `t7-6522-negative-1`, including original responses,
`no-write-file-audit`, restoration proof and result. Port 4197 was closed and the
lease absent at the completed boundary. Recovery remains a separate pending run.

The negative-run terminal audit also retains seven generic observer-disposal
warnings during context replacement. That observer does not identify the URL or
operation, so those warnings cannot be classified conclusively as read responses.
The finite case handler separately read and asserted all seven actual refusal
bodies before replacement; none of those mutation outcomes is missing. Capture
and receipt-inclusive file equality independently establish the no-write result.

## Incomplete-page capture candidate

Composer #987 source `42306257ddfb507a8cd8754171b423bd77b01aed` is integrated as
`13dd89dd`. Native authoring capture alone tolerates the compiler's source-confirmed
unassigned-page diagnostic while retaining exact references from all Content,
Composition/defaults and materialized routes. Strict release/inspection/trash
helpers remain unchanged; compiling an incomplete snapshot still refuses. Other
compiler diagnostics, missing/unknown/corrupt Assets and concurrent changes remain
blocking. Independent capture/concurrency tests and CLI type/lint checks passed;
27 integrated capture tests passed in 9.91s. Public generation/check/type surface
passed in 40s. CMS currentness failed on generated host metadata and requires its
normal regeneration; this failure is not waived.

Immutable package `26862ff8aa26bcede896a4d5c12ae62c8ca1b86d` is attested by
`1c63a3b8de8d240946f683730c648289ec29e3e1`: 778 files, payload digest
`ef01f944a234f73721ab9b8b30472bb3e3e75cd113083c5b3c3c8ef9e49b8c30`.
All four Pinsel manifests and the lockfile use this pin; installation passed in
9.4s, followed by frozen install, dedupe and no-deploy checks. Main public capture
`6ffa4a5d…` → `e9d6ffa587adff79302c87f985a60e339f81dedac4982b2c07dcdbe3b64f0d0d`
changes only snapshot/pack/renderer digests and compiler identity; all other
fields, including data/tokens/Assets, remain exact. Installed recovery of the
retained unassigned page is pending; no startup bypass or reseed has occurred.

The #987 CMS currentness failure was resolved by normal regeneration and a
successful four-host check in 61s. Independent recursive comparison of all 16
changed JSON files found only top-level mutation tokens changed; authored records
are exact. Composer source head `d68a35fb79fad6386fcfbf39ed1e849182376200` retains
the exact attested 26862 payload, verified after committing generated fixtures.

## 6522 receipt recovery and separate restoration

The normal recovery run on e63/6522 remains **FAIL** (193s). It did prove dropped
forward-response handling and fresh-browser recovery of the exact committed
receipt. Cleanup then refused before issuing an inverse because the test replayed
a request outside the approved UI session path. The actual refusal body was not
retained, so its observed error code is unknown. The public failure capture
`b8c58e24a76e72751daf83769fe106eb0fc363b38aa9805ae4b4900cf2cda0c8`
proved only the recorded Lessons placement remained moved.

Reviewed fix `e26583115c0bb608fde43ac129b9934e2c1167da` (integrated `89edd23`)
verifies the retained successful receipt and exact moved state, then uses the
actual approved UI inverse. It records raw HTTP status/body durably before
assertions and never retries an unknown mutation. Independent 32 tests and 24
integrated recovery-proof tests passed.

A separately reviewed, hash-bound restoration adapter preserved the original
failed evidence and source/pin while copying recovery inputs to a new artifact
directory. This restoration-only run passed in 138s. The approved UI inverse
returned HTTP 200, operation `29d4349c-1d7f-4658-98c3-0257d4790448`.
Final capture `aa1db648e32d890b40e5a7066e432c0815cb1aaaa80676dee6d2e24d20ca1ef6`
restores all authored values; Content (including generation/token), Mapping,
Sitemap, Assets and public files are exact. Composition revision metadata and
receipt history remain. Original evidence hashes are unchanged; checkout clean,
port 4197 closed, lease absent. Evidence: `t7-6522-recovery-restoration-1`.
This is not a normal full recovery pass; a fresh committed-runner run is required.

## 26862 normal receipt-recovery acceptance

The fresh, normal committed runner at Pinsel
`80ff25f53ed078cbe47a6c3e0ad3ed6561f06055` / Composer
`26862ff8aa26bcede896a4d5c12ae62c8ca1b86d` passed recovery in 251s. It withheld
forward operation `6a3baed2-c73a-40b5-8086-6968c019fdf6` after commitment,
recovered the exact same receipt in a fresh browser, then issued the approved UI
inverse `49aa0243-75b7-4978-b27f-d2d95761e3cf`; all observed server responses were
HTTP 200. This is a normal scenario pass, distinct from the earlier failed run
and restoration-only proof.

Full final capture is
`213a49bb911fde8bcf26cb9f3ea640a6b52864595558c40f9344edccecdc46f7`.
Authored values are restored; Content generations/token, Mapping, Sitemap, Assets
and public files remain exact. Composition revision metadata and receipt history
remain. Evidence under `t7-26862-recovery-1` includes original requests/responses,
captures, pending/recovered screenshots and terminal audit. The checkout was clean,
port 4197 closed and the actual lease absent at completion.

## Blank-path placeholder capture follow-up

The first installed #987 candidate still refused the actual UI-created draft:
its absent slug inherits `/`, producing collision diagnostics in addition to
unassigned-page. All 1,002 retained cold native/public/release files stayed exact
after installation and the failed capture. No recovery or next write was claimed.

Follow-up source `e2ee0f81967a9e6cd271d73b8c4168d157091a95` (integrated `64635624`)
handles only authoring collision groups whose participants are all accounted for:
source-confirmed unassigned placeholders and at most one materialized assigned
destination at that exact path. Assigned duplicates, including multiple expanded
Mapping routes from the same node, remain blocked. Compiler/expansion and strict
release/trash behavior are unchanged. Independent 73 regressions plus 20 asset
tests passed; 36 integrated capture tests and the full typecheck passed. A readonly
test-fixture construction error reported by CI was corrected without changing its
assertions. Public/CMS generation, currentness and public type checks passed in
96s; all 16 generated CMS changes are mutation-token-only.

Package `69ca1f49198fefd262e525e22d3f190022f63cf0`, attested by
`94a34d5869427e45e3ebcfec081d449122d0e3f9`, has 778 files and payload digest
`3678285649899fcfa96cd294e994d5c292f0a89819c14aa9c945278548fd07a6`.
All four Pinsel importers and the lockfile use this pin. Install passed in 10.7s,
then frozen install/dedupe/no-deploy passed. Main capture is now
`00a5956929993f102a8f90cbef5c7e1230aaf7dcb7785be02566548cc6f82278`;
only snapshot/pack/renderer/compiler identities changed from e9d6, with every other
public capture field exact. Installed cold recovery remains pending. This source
fix and successful installation alone do not complete #987.

## Blank-page recovery and current gates — 2026-11-17

At Pinsel `1697467860626dccfcecafd4de1dc4bc0d44b481` with package
`69ca1f49198fefd262e525e22d3f190022f63cf0`, the independent installed
consumer reopened the original saved unassigned page successfully. Public Sitemap
readback retained UUID `untitled-page-e8273cca-6b5c-4783-8463-4c62825f5854`,
title, unassigned source and absent slug. Full captures before and after normal
startup matched `d06a560fa2ebb34dd18e80316818b3bb028220cb0a585de389e5b95e09f46acb`.
No canonical mutation occurred. This 65-second recovery pass does not relabel
the original page-create timeout or the two older capture failures. Subsequent
page configuration and exact static rendering remain in progress.

Current-head Pinsel CI passes. Composer CI has one real failing starter-template
test: its temporary host cannot resolve `zudo-composer/config`; 5,456 other tests
and 25 other jobs passed. That gate remains blocking.

Separate installed Content-policy checks at package6522 passed historical read,
human invalid-save refusal, AI invalid-proposal refusal, publication refusal and
valid human save. AI Apply/Undo stopped before mutation on review-card readiness;
its retained proposal is being reconciled. The extra canonical-record scenario
stopped before Content edits after repeated startup busy refusals; full captures
match and no record was created. These are unfinished checks, not passes.

## Canonical workspace summary candidate — 2026-11-17

[Composer #988](https://github.com/Takazudo/zudo-composer/issues/988) changes
workspace summary metadata and Mapping source diagnostics to use validated
canonical Composition snapshots where supported. Editor `list`/`get` and derived
output validation remain unchanged. This addresses the observed summary-output
continuation racing host-preview capture; installed verification remains required.

Package `d5ac410b3c9e4b1781289ae47cc48be47efaa099`, attestation
`bc61dc483df4b342120ffd579b66d4aacd79e503`, contains 778 files with payload
`5452b4337d11c9e91b4f45f451b6a39c6c269b61a115cba2bc6330dd38bf02d6`.
Only summary source and structural-authoring documentation differ in the shipped
payload from69ca. Independent review and 42 focused regressions passed; integrated
42 tests passed in3.51s. Public build/check, all four CMS fixture checks and public
types passed in77s with no generated changes. App/Node types and scoped lint passed.

Pinsel installed all four exact pins (11.6s), then frozen install, dedupe and
no-deployment checks passed. Public capture changed from00a595 to
`1099aaa3c4e03aca4902b63784b0eea6b4b3fc8cfd529ed3e3a1cbf07cfc4d56`: only
snapshot, pack and renderer digests differ; compiler identity and all other
public fields, authored domains, tokens, Assets and public files are exact.

The separate creator-template CI failure was reproduced and fixed by provisioning
its source-test public dependency outside the generated host inventory; unchanged
portability assertions passed. This test-only change leaves shipped bytes intact.
Current candidate CI and installed extra-record/title-recovery scenarios are pending.
The title edit itself is already saved; its previous reload verification timed out
on background catalog reads. It will be read back, never replayed.

## Mapping summary follow-up — 2026-11-17

The first #988 package removed startup busy refusals in C3, which created and
saved six fields on one extra draft. That run remains FAIL482s: unrelated Mapping
summary reads exceeded the existing180s idle bound before restart inspection.
The original draft and all seven verified commits remain retained at snapshot
`4172d62fa492c53d33844d9052c626559957f54ba5309bcf785cf686570e784e`.
No delete or absence phase is claimed. Separately, saved-title restart recovery
passed70s at446153e/d5ac with fullc383 capture equality.

Package `5fe6d8d92f5013943053491794c0502b83228d53` (attestation
`4e9c642050bed7f2597245ae4ad4ab3f278c3de5`) batches summary Mapping snapshots
and memoizes qualified Content-model reads within each evaluation. It preserves
native recency/ID order, configured provider order, fallback behavior and diagnostic
semantics. Content entry scans and editor APIs are unchanged. Independent49 tests,
app types and lint pass; integrated49 tests passed3.68s. Public/CMS/types checks
passed99s with no generated changes. Shipped778-file payload:
`5f433a53a0ffb17cf036f6ea7627bb05a61f9d39c59fa0684990692bf9ba0089`; only
summary source and structural documentation differ fromd5ac.

All four Pinsel pins use this package. Install11.9s, frozen install, dedupe and
no-deployment checks pass. Main capture is
`44d5894dd38207fdeb1ad76d6461f18e4207d418a37eb9bdc295d513db630d5e`; only
snapshot/pack/renderer digests changed from1099aaa3. Compiler and every other
captured field remain exact. The previous446153e/bc61 candidate CI passed in both
repositories; new-head gates and new-package installed acceptance remain pending.

The separate frozen6522 policy lane has now recovered both durable Apply and Undo
receipts after its original response-observation failures. Exact four-revision
history, restored human body and full unchanged readback capture are proven. Those
original attempts remain FAIL/lost-response; the recovered chain is distinct.
Restoration of the original seed body, corrected-draft publication and build checks
continue. No authenticated inference or owner-data cutover is claimed.

## Resumed current candidate verification — 2026-11-17

Actual checkouts and remote heads were reconciled after the Cloud interruption.
Pinsel `b434c8fefd4c9659a9306c4e8481ae3262b46385` and Composer
`4e9c642050bed7f2597245ae4ad4ab3f278c3de5` remain protected on their existing
PR branches. Current-head CI passed: [Pinsel44050658100](https://github.com/zudolab/pinsel/actions/runs/44050658100)
and [Composer44050158945](https://github.com/Takazudo/zudo-composer/actions/runs/44050158945),
including all26 Composer jobs. The earlier creator-fixture failure remains historical;
its corrected current-head test passes. Delivery remains stopped.

The already-installed cold, canonical and fresh final consumers retain all1002,
971 and948 native/public/release files respectively, including exact paths, hashes,
sizes and modes. Public before/after capture comparisons permit only the actual
snapshot/pack/renderer digest changes; compiler and all other fields are exact.
No reinstall, reseeding, title replay, extra-record recreation or repeated Undo
was used during resume. The new current-pin runtime suites are separate evidence
from these preservation checks and remain in progress.

Frozen6522 policy readback confirms the durable Undo revision
`fe1f528e-173b-44e5-af3c-c94049ece3bd`, expected token4, undone review status and
history4→3→2→1. Its read-only before/after capture is exactly
`a876727dd33365ecd6cb6e3b7a4b6ccfe7a7425bd706eb95d7579824f940db84`.
The subsequent original-body human restoration also passed, producing
`d634fae20f9aa61414b03a914e77b62a1505dcdea966fe615427a7c0326da5f9`.
Explicit correction of the synthetic historical Note passed195s, token5→6,
capture `de033ceadae702c6be6e315a70b948e26c2dd36403e92866901090aeb29c865a`.
Selected publication and production static build remain pending. Original response
observation failures are not relabeled as uninterrupted successes.


## Installed 5fe6 acceptance progress — 2026-11-17

The package remains `5fe6d8d92f5013943053491794c0502b83228d53`, Composer source
`4e9c642050bed7f2597245ae4ad4ab3f278c3de5`, contract
`c0b452da075b66757c60bd0d721a47062d4354d0`, renderer native-v3. Source-only
Pinsel acceptance fixes through `9497fffb4acd6277d25f31fa3bad5ab21b91a46a`
add executable family/restart/public-release-readback recipes and match the actual
capability/workspace scopes of installed providers. Independent proof tests pass90
cases. These are harness changes, not another package revision or browser pass.

The independent final consumer at b434c8f/5fe6 passed the full human suite in969s:
Sitemap/tree/preview ownership, nested Paragraph insertion/save/reload/restart,
shared Home/Lessons price and Contact labels/order, stable legacy and canonical
course links. Snapshot A
`9c3fd2e28376acbf36fe964f2c8b610c691d0903f6ec0b1b2884ac5359680071`
built exactly14 routes/143 public files after the workspace advanced to B
`a7de1d36939f77a7f01263f6e7d76a3762ad4aa506e8fb1e6f12a40abf2f3e89`;
full capture B remained unchanged by that build. Explicit inverses restored values,
retaining legitimate history/token1→7 at
`c6b4ddbf00fcd40177263cd27d1f19b794efd6ac954eefd110ef29bad3192fe1`.
The separate negative suite passed256s with seven actual semantic refusal bodies,
full capture equality and816 unchanged canonical/receipt files. Seven generic
observer disposal warnings remain qualified by the retained case-specific bodies.

Canonical extra-draft read-only recovery on b434c8f/5fe6 passed347s: the retained
UUID, all six actual UI fields, whole public Content and the real About preview
were verified without Content attempts. Before/after full capture equals
`179d8e52b8f796a821ce0bfe9c24dd4079d8668bd8901acc1362e20cad0eee26`.
Original create/reload failures remain failures. The reviewed one-time deletion
and restart-absence continuation is pending; no extra draft was recreated.
The retained static page's slug edit separately passed331s with one original
Sitemap response, actual-document reload and qualified record readback. Source,
hierarchy, page-copy publication and final static-route acceptance continue.

The policy lane retains original6522 invalid-body/refusal and durable receipt
proofs. After the original publication attempt stopped before Apply dispatch,
an audited upgrade to0180c09/5fe6 preserved967 stored files and changed only the
expected capture/pack/compiler/renderer identities. A fresh reviewed publication
passed244s: public null-active/empty catalog, new plan/stage/build/activation and
exact readback; Content token6→7 published only the corrected synthetic Note.
Capture `3267f82ada33be93d9f061358984e9d215bcb83c835276df69e69606d5dfd131`
produced15 actual Pinsel routes including `/notes/policy-986-historical`.
Local active revision is
`72c02153f185a962029aeb1e4e0ba4925be0bdf00b101a170be57903796e44ad`, build
`61030a3dc97847a122e92fbf5a55558aaf16d7b5cdb84f04a3ee67d909e337be`.
This proves local publication plus separate production-renderer output; the UI
explicitly reports that activated-release preview is unavailable. Saved-host preview
is not mislabeled as activated-release preview. Nothing was deployed.

The independent documentation operator's Header forward edit passed326s and an
exact14-route/143-file build at0180c09/5fe6. Its first read-only restart failed on
an incorrect harness workspace-header requirement for Assets; full state stayed
`9c33f5119625bfdca1a4f1795d907d98c27f745b4869fdf081b426b45115cc02`.
The corrected stopped consumer was upgraded to9497 with1109 files preserved and
unchanged frozen dependencies. Retry, explicit inverse/restart, Knowledge, Header
href and Results/FAQ family runs remain pending. A separate known-data family
consumer has246 published records/no drafts; its949-file source-only upgrade also
preserved storage exactly. No existing stage was reinitialized.

Two initial documentation-consumer imports were mistakenly run outside the shared
heavy guard. Both exited0 against new known-data stages; original logs and the
workflow deviation are retained. They are not claimed as guarded runs. Subsequent
heavy work uses the shared guard. No owner data was available or touched.

Current-package Assistant and controlled-interruption acceptance are still pending;
older-package successes remain separately identified. See [T7 progress](https://github.com/zudolab/pinsel/issues/56)
for current runtime artifacts and queue state. Actual owner-data cutover and new
live-provider inference remain held under #57/#58. PR61/979 remain drafts until
remaining acceptance and integration review are complete.


## Restart, interruption and portable static recipes — 2026-11-17

At b434c8f/5fe6, controlled interruption acceptance passed270s. The supervisor
exited86 only after a real forward save and fresh-browser exact receipt recovery;
it did not claim an arbitrary mid-write crash. The unmodified committed recovery
runner performed the guarded UI inverse, HTTP200, and restored canonical values
while retaining metadata/history. Forward operation
`e39b3d23-ffe7-4185-af89-540c463189df`, inverse
`a04561da-eecf-4783-973c-332d238bc3a4`; final capture
`3b53b5dc441191e979c5d3c633fe89334fe8dc0dd718a55cc8f198064aad7314`.
The seven-case current-package Assistant run starts from this actual restored state
and remains in progress; individual subphases do not establish aggregate PASS.

At f54fb9b/5fe6, independent Header restart passed64s with full9c33 capture equality.
Three original authoring-busy responses were retained until matching original client
successes;25 known reads arriving during close were aborted without dispatch.
No held request or canonical mutation occurred. Independent public active-release
restart passed63s with full76a34 capture equality and exact
`d22c0d5e4d9e93550ee22cf8886fad597270360d434509e3efdbb161b9cc11cf` /
`0cf148dac4192c0df2038128accac9c5eaa02e4b51fb6e499d72eb1b310d9fc1`.
Earlier wire-scope, close-fence and busy-observation failures remain separately
recorded. Neither read-only recovery reactivated the release.

Static source assignment passed209s through the installed UI, reload and exact
qualified record readback at b434c8f/5fe6, capture
`50dd316d434404f96785591e1e4c1975744bae3ade6305c33d309ab8367677a9`.
Earlier wrong-role/default-readiness attempts made no canonical writes; their full
captures remained identical. The accepted runner seals both intent and full capture
before launching its browser. Remaining page-copy/hierarchy/navigation/publication
and production-output phases are still pending.

Canonical extra-record deletion was executed once and confirmed by the original200
transaction response and full public readback, token14→15. The original project is
restored at `a88191c9dd0bdb769bf0de6d28764157acb3201e1882c99c547ac0516d1a6e44`,
with all eight actual commit proofs retained. That continuation remains FAIL318s
because a transient toast was not observed; a separate read-only restart-absence
check is pending. No operation-key server receipt is claimed for this generic
Content transaction, and no deletion is replayed.

The repository now supplies the complete static acceptance recipe under
`tests/native-authoring/static/`, plus a separately qualified retained-state
verifier. Independent review found and fixed two provenance gaps before integration:
Content responses must bind exact qualified owners/submitted values/ordered saves,
and recovered records must bind actual original failure, acknowledgement, capture
and paired public read evidence. The historical phase04 missing-original-capture
exception is constrained to that exact Sitemap creation case and remains explicit.
Final source d9835ad review passed48 tests and checked43 actual phases01–06 evidence
hashes. Integrated standalone tests passed48 cases/11 files in3.10s; root Vitest
now includes `native-static-proofs`. Source tests and partial evidence inspection
are not the full15-phase installed pass. The retained runtime verifier and actual
production-build proof remain pending the completed pilot.

Independent integrated runtime-source review at Pinsel f54fb9b / Composer4e9c642
found no concrete P1/P2 in inspected ownership, Assistant guards, capture/build,
migration, renderer and delivery paths; it excludes the separately reviewed static
recipe and does not replace runtime acceptance. Pinsel eede2d8 CI passed. The first
f54 CI attempt failed when a subsequent local workerd launch reported an occupied
address after the observed authentication assertions passed; downstream gates were
skipped. The unchanged auth harness received one same-head failed-job retry, whose
result must be read separately. No assertion or gate was weakened.

A Header inverse was accidentally queued with incorrect cache-directory variables.
Its exact owned guard was verified not admitted, terminated with exit143 and checked
for no application/artifact/lease before a new corrected-environment invocation.
This configuration-error cancellation did not stop the active foreign job or replay
a write. The earlier unguarded initialization deviation also remains recorded.
Owner-data, authenticated provider and no-deployment holds are unchanged.


## Current installed acceptance checkpoint — 2026-11-17

This checkpoint supersedes the earlier pending Assistant, controlled-interruption
and canonical-absence statuses above; it does not relabel their original failed
attempts. The independent final consumer remained at Pinsel
`b434c8fefd4c9659a9306c4e8481ae3262b46385`, Composer package
`5fe6d8d92f5013943053491794c0502b83228d53`, Composer source
`4e9c642050bed7f2597245ae4ad4ab3f278c3de5`, contract
`c0b452da075b66757c60bd0d721a47062d4354d0`, renderer `native-v3`.
The following are actual completed runs, not source-test results:

| Installed scenario | Observed result | Retained evidence under the cloud acceptance notes |
| --- | --- | --- |
| Human authoring | PASS, 969s: Sitemap/tree/preview ownership, nested insertion/save/reload/restart, shared Course price and Contact labels/order, stable course links. Exact snapshot A built 14 routes/143 public files after later B; B stayed unchanged. Explicit inverses restored canonical values, preserving history. | `t7-5fe6-full-1/operator-summary.json`, `exact-A-after-B-proof.json`, `restoration-proof.json` |
| Negative ownership/validation | PASS, 256s: seven actual semantic refusal bodies, full capture equality and 816 unchanged canonical/receipt files. Seven generic observer-disposal warnings remain qualified by the retained case-specific bodies. | `t7-5fe6-negative-1/operator-summary.json`, `no-write-file-audit.json` |
| Controlled interruption/recovery | PASS, 270s: deliberate outer exit 86 followed a real forward save and fresh-browser exact receipt recovery; the unmodified committed runner performed guarded UI restoration. This is not an arbitrary mid-write crash test. | `t7-5fe6-controlled-recovery-1/supervisor-result.json`, `operator-summary.json` |
| Assistant | PASS, 3455s: complete normal, unfiltered seven-case run, `restorationOnly:false`, `errors:[]`. All proposal/apply/undo, stale and guarded-Undo cases completed. | `t7-5fe6-assistant-1/result-1794915802270.json`, `operator-summary.json` |

Assistant cases were shared Course pricing, FAQ, Note, local component fields,
structural insertion, stale Course proposal, and guarded Course Undo. All five
ordinary proposal captures proved canonical state unchanged before Apply. A fresh
browser recovered the same Course operation key and durable receipt, rather than
reapplying the request. Stale Apply returned 409 `stale-plan` with unchanged
same-server preview identity; conflicting Undo returned 409 `revision-conflict`
with full before/after capture equality. Explicit restoration preserved canonical
values and legitimate history, advancing Content token 7→18 from
`3b53b5dc441191e979c5d3c633fe89334fe8dc0dd718a55cc8f198064aad7314` to
`96b956c6b91a6cbc8c2c5cb7644df9905b6d43af202671739b431173e0e3ae28`.
The final consumer audit records a clean detached checkout, closed port 4173 and
no matching runtime process or authoring lease; saved artifacts/history remain.
The separate manager terminal audit is
`t7-5fe6-final-manager-terminal-audit.json`. Independent saved-artifact review
(`t7-5fe6-assistant-independent-audit.md`) passed across 44 hashed inputs.
The Assistant observer used actual server responses through Playwright
`route.fetch`; it is not the newer original-request-only transport. Stale Apply
evidence is identity-level; guarded Undo has full-capture equality as stated above.

**Provider qualification:** this Assistant pass used the deterministic fake
provider. It proves the installed context/proposal/review/apply/recovery/Undo
integration, not authenticated model inference or the quality of a real model's
edits. Historical real-provider evidence remains separately recorded. New
live-provider acceptance and actual owner-data import/cutover remain held under
[#58](https://github.com/zudolab/pinsel/issues/58) and
[#57](https://github.com/zudolab/pinsel/issues/57). No owner database was imported,
no active owner editor was switched, and nothing was deployed.

Canonical read-only absence recovery subsequently passed in 115s at the same b434/5fe
installation. Both full captures equal
`a88191c9dd0bdb769bf0de6d28764157acb3201e1882c99c547ac0516d1a6e44`, Content token 15;
there were no Content mutation attempts. The 53 frozen inputs and eight original
commit proofs remain retained in `canonical-extra-absence-5fe-1`. The original
create/reload and delete-toast attempts still have FAIL status. This separate
restart proves absence after the one acknowledged deletion; it does not replay
that deletion or invent an operation-key receipt for the generic transaction.

### Source-only harness correction and remaining acceptance

Independent source review found that family root actions selected virtual Document,
and mutating family/Header children reread external intents after parent admission.
Commit `17a99d3455ebe9f4599fa3d9a5be2f7ad21d9bd9`, integrated as
`94cdebf77e4538bb7730264e3a3b42d6ce7c0888`, fixes those harness defects. Root actions
now verify the exact canonical component ID in the inspector; both runners consume
captured intent/full-snapshot bundles bound by an independent hash. Structural
reload acceptance requires the selected owner, Saved state, actual document
navigation and complete public record readback, with bounded quiescence. Pin rows
retain exact ID selection and the existing 180-second readiness budget. Existing
mutation validators, original-response matching and full-state deltas remain.

Independent source review was CLEAR_SOURCE_ONLY. Root standalone checks passed 109
family, 27 Header and 48 static tests. These are not browser passes of the remaining
scenarios. Stopped documentation consumers moved from f54 to 94cdebf with 1109/970
stored files preserved and the same four package pins/lockfile; those raw-storage
audits do not replace each next run's complete public-capture preflight. Queued old
family/Header jobs were verified not started and cancelled for these correctness
fixes; original cancellation evidence is retained. No stage was reinitialized.

At this checkpoint, the static pilot has accepted phases 01–07 (with historical
recoveries kept distinct); phase 08 has started but has no accepted proof yet.
Phases 08–15, subsequent retained-state production-build verification and Header
href acceptance therefore remain incomplete. Header forward/restart and the first
local baseline/active-release restart have separate completed evidence above;
Header inverse/restart, Knowledge reference edits, and the complete 45-phase
Results / 43-phase FAQ sequences remain pending. Preserve every required action and
per-phase exact capture; do not substitute synthetic snapshots, private-store
aggregation or live-server capture for the supported exclusive offline boundary.

The independent `family-coverage-review-94cdebf.md` also identifies required
follow-up evidence beyond all 88 creation/configuration phases: exact FAQ answers
and Results secondary fields, two-child rendered order, native and actual static
browser interactions, and a manifest binding created, moved and restored states
to their capture/proof/build identities. Additive verifiers are being prepared;
none of these follow-ups is claimed as passed here.

These current-package passes do not close T6/T7 or PR 61/979 by themselves. Remaining
installed scenarios, current-head repository gates, independent integration review
and eligible merges are still required. See [T7 progress](https://github.com/zudolab/pinsel/issues/56)
for subsequent results and exact queue state; source 94cdebf CI is not claimed as
passed by this documentation checkpoint.
