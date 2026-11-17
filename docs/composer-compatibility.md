# Composer compatibility and acceptance ledger

Update this single ledger at each meaningful integration boundary, with exact
immutable source/package identities, workspace/schema identity, scenario, commands,
results and linked issue/PR evidence. The manager owns pins and lockfiles.
Tracking: [#51](https://github.com/zudolab/pinsel/issues/51),
[T0 #52](https://github.com/zudolab/pinsel/issues/52).

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
are documented but actual cold-operator saved edit is still NOT_RUN.

## Live-lease and host navigation candidate

Current package `1af202393e9d1510aee87f17dbc09ea49d59ea44`, Composer attestation
`784fe903`, includes actual HTTP host-review lease correction (`a29d1d16`) and
qualified host preview/Sitemap handoff (`1f5d59f2`). Its773-file digest is
`beb3378905528d1746d4aab7cf6a87659dccabfc89d5e83c60cc018519c32f3c`.
Independent15 service tests,45 navigation/selection tests, full typechecks and
scoped lint pass. Combined public/CMS regeneration, no-deploy and headless boundary
checks passed under guard74s without generated drift. Installed current-pin
Assistant and navigation acceptance remain pending.

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
