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
