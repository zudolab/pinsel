# Verification index

Each report records the commit it tested. A result holds only for that commit. A later head needs its own run, and a historical local result is never evidence for a newer head. Nothing listed here involved a deployment, a live Cloudflare or GitHub request, or a real inquiry.

| Report | What it proves | Tested on |
| --- | --- | --- |
| [gate-1.md](gate-1.md) | Gate-1 (zudolab/pinsel#7): one canonical record (`course` as the home pricing cards) works across zudo-sg, the Composer editor and preview, the D1 API (upstream storage conformance on real local D1) and no-JS ZFB HTML. Also covers byte parity between the workerd preview and ZFB, the external git-pin install, and 28 `wrangler dev` behaviours. | `pinsel-site-cms/gate1` @ `489953dd` (base `9ab6d86`), Composer `7ca114a3`. Historical: the pack, digest and route figures were superseded by the wave-4 reconcile (noted in the report). |
| [public-site.md](public-site.md) | The public site against the approved prototype (zudolab/pinsel#17): fresh-clone build, strict checker 14/14, 84 screenshot pairs at 0.00%, no-JS, keyboard, fragments, TOC, motion, contact, overflow and zoom, contrast, axe, isolation. Two fixes: token layers and accessible names. | Historical local results: `pinsel-site-cms/confirm-site`, base `532bb8d`, fixes verified at `6b1199f`. Post-merge sections: PR #27 lanes and the final-head placeholder. |
| [cms.md](cms.md) | The CMS and publication slice (zudolab/pinsel#18): persistence across restart, preview identity and stale acknowledgements, 58/58 production-entry auth probes, typed refusals, concurrency and idempotency, snapshot immutability, the publication state machine (fake provider), content-validate on an edited snapshot, boundaries, external install. Four fixes (F1–F4). | Historical local results: `pinsel-site-cms/confirm-cms`, code `44208b1`, regression at `41f60c9`, base `532bb8d`, Composer `547b532e`. Post-merge sections: PR #27 lanes, the changed-snapshot re-run at `03e7518`, and the final-head placeholder. |
| [issue-1-report.md](issue-1-report.md) | Historical report template; the completed report was posted on [#1](https://github.com/zudolab/pinsel/issues/1#issuecomment-6139039236): PRs, merge SHAs, upstream PR and pins, dependency identities, verification summary, open launch inputs, limitations and the missing revised handoff package. | Historical pre-posting template, retained only as a record; authoritative completion is linked above. |

## Maintained gates for issue #28

[local-gates.md](local-gates.md) documents `pnpm verify:auth` and `pnpm verify:publication`, enforced by every ordinary CI build. Each run emits its exact source SHA and sanitized outcomes; these are separate from all historical #27 evidence below.

## Post-merge integration lanes (PR #27, branch `fix/pinsel-post-merge-confirmation`)

These are local lane branches merged into the integration branch. Their results hold for the lane commits, not for the final head.

| Lane | Commit | Scope | Recorded on |
| --- | --- | --- | --- |
| Recovered confirmation work | `5b95a24`, `325321e` | merged as-is from the original checkout's local commits `ae767f0`, `a96eaed`, `3f31dc0`, `4b328fa` (with `f28bbdb`) and `41d79d1` | zudolab/pinsel#19 |
| Public / accessibility | `43917cb` | axe-core 4.14.0 pinned and always run, visible-text names, token cascade on three surfaces | zudolab/pinsel#17 |
| Approved seed and content gate | `f9b7047` | hash manifest of all 83 fixture files, unconditional migration checker, fail-closed `content-gate` | zudolab/pinsel#19 |
| Dependency refresh | `64afe4f` | zfb family 4.4.0, zudo-sg 0.5.4, `ZUDO_DEPS_PINS.md` | zudolab/pinsel#19 |
| Docs and changed-snapshot path | this branch, on `03e7518` | README, architecture, launch inputs, this index, the #1 report; edited price and FAQ through the real publisher path | zudolab/pinsel#19 |

## Historical PR #27 final-head results

- Head: `ef256bde4e660556378fa495e3425547eaff633d` (code under test; the only later commit fills these result sections and changes no code). Local machine run on 2026-10-13 through `heavy-guard.sh`, verdict PASS, starting from deleted `node_modules`.
- Results (each command exit 0, in CI order):
  - `pnpm install --frozen-lockfile`, `pnpm dedupe --check`, `pnpm no-deploy:check`
  - `pnpm check:approved-seed` — 83 files, manifest sha256 `eecacda9…`
  - `pnpm assets:sync`, `pnpm content:assemble`, `pnpm content:project` (14 routes), `pnpm content:check` (246 entries, 14 routes, equals the golden)
  - `pnpm build:site` (16 pages), then `pnpm check` — vitest 412 passed, 15 skipped
  - `pnpm sg:check`, `pnpm build:sg` (50 pages), `pnpm check:token-layers` (44 tokens layered in the styleguide preview and the site dist)
  - `pnpm build:editor`, `pnpm assets:assemble-worker` (136 files), `pnpm assets:verify`, `pnpm check:boundaries`
  - `pnpm worker:dry-run`, `pnpm worker:bundle:check` (no node:/vite/preact/local fixture/seed/fake provider), `pnpm worker:check-preview`, `pnpm worker:types:check`
  - `pnpm verify:external-install`
  - `check-publication.mjs --dist apps/site/dist` (246 entries, 14 routes), `check-public-output.mjs` (153 files)
  - `pnpm check:content` — strict historical checker 14/14 (0 missing files/copy, 0 record/link/shared/metadata issues)
  - `pnpm site:check-fragments`, `pnpm site:wrangler-dev` (6/6), `pnpm gate1:wrangler-dev` (29 steps)
  - `node scripts/verify/worker-auth-probe.mjs` — 58/58 against the production entry with a local fixture JWKS
  - `pnpm test:browser` — 81 passed, 15 skipped. The 15 skips are the reference-only checks (no-JS copy parity on 14 routes and the prototype token measurement) with the reason "PINSEL_REFERENCE_DIST is not set"; axe-core 4.14.0 runs unconditionally.
  - `PINSEL_REFERENCE_DIST=<seed>/prototype/dist playwright test public-site.spec.ts token-layers.spec.ts` — 62 passed (reference-dependent checks against the verified approved prototype)
  - working tree clean afterwards
- Not performed: any live test (Access, remote D1, GitHub publication, Workers Builds, contact delivery). Nothing is deployed.
- CI: the PR #27 checks on this head (see the PR's Checks tab); `publication-validate` / `content-validate` skip by design because the branch carries no publication snapshot.
