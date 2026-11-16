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
