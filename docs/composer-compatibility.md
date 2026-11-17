# Composer compatibility and acceptance ledger

Update this single ledger at each meaningful integration boundary, with exact
immutable source/package identities, workspace/schema identity, scenario, commands,
results and linked issue/PR evidence. The manager owns pins and lockfiles.
Tracking: [#51](https://github.com/zudolab/pinsel/issues/51),
[T0 #52](https://github.com/zudolab/pinsel/issues/52).

## Current candidate at a glance

Historical entries below retain their original outcomes. Latest complete Assistant evidence:
[bc20 seven-case acceptance](#bc20-complete-seven-case-assistant-acceptance).

| Identity or gate | Current recorded value |
| --- | --- |
| Pinsel complete Assistant tested source | `f07e05b8f9e22379cb321bf80a11d47b26800e24` |
| Current candidate package / attestation | `4f1191d682995438380fccdb5bb692a299415402` / `75df80f75c0a34f99bcc8cbd02447fd47ddc70a9` |
| Component contract | `c0b452da075b66757c60bd0d721a47062d4354d0` |
| Workspace / schemas / renderer | `pinsel`, snapshot 1 / Composition 2, pack `pinsel@0.4.0`, `pinsel-zfb@native-v3` |
| Installed acceptance | Complete seven-case Assistant PASS at bc20; human provenance/refusal and canonical migration PASS at4f; remaining scenarios tracked below |
| Latest checked CI | Composer75df all26 jobs passed; Pinsel2f48ea9 run44026306585 in progress; later heads require fresh gates |
| Separate holds | Remaining T6/T7 acceptance, owner-data cutover and new real-provider acceptance |

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
