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
