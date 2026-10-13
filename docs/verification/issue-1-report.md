# Historical completion-report template for zudolab/pinsel#1

The completed report **was posted** after PR #27 merged as `dbc4f594b8f5ea96d169fa40f89cfd2ff7664e8f`: [authoritative completion report on #1](https://github.com/zudolab/pinsel/issues/1#issuecomment-6139039236). The text below is the historical pre-posting template, preserved with its original placeholders. It is not a pending delivery task and is not evidence for later heads. Current verification commands are documented in [local-gates.md](local-gates.md).

---

## Pinsel is implemented and merged into `main`, not deployed

The approved public website (13 content routes + `/404.html`) and the first constrained CMS are implemented and verified locally. The CMS has the Composer content-only editor, a private authoring Worker with Access JWT checks and D1, the server-rendered preview, and the Git publication adapter. Two PRs merged them into `main`. Nothing is deployed, no Cloudflare resource is provisioned, no real inquiry was sent, and nothing was published live.

### Pinsel PRs

| PR | Scope | Merge commit |
| --- | --- | --- |
| zudolab/pinsel#20 | the full implementation (epic #2, sub-issues #3–#19) | `597d2fcf29d875ccac41b07700d772c95e16fd2b` (2026-10-13) |
| zudolab/pinsel#27 | post-merge confirmation integration: the recovered #17 / #18 confirmation work, axe pin, token-layer regressions, approved-seed hash manifest and fail-closed content gate, dependency refresh, docs | `TBD-after-merge` |

Neither merge triggers a deployment. No workflow deploys, `pnpm no-deploy:check` guards the scripts and workflows, and Workers Builds is not connected.

### Upstream Composer is consumed at a reachable SHA, and its PR stays open

- Takazudo/zudo-composer#904 (for Takazudo/zudo-composer#903) is **open, draft**. It was not merged, because no upstream merge is authorized.
- `zudo-composer@git+https://github.com/Takazudo/zudo-composer.git#547b532eb56dfecaec1e2bd9060f8d579ad8862c` (head of #904).
- `@zudo-composer/component-contract@git+https://github.com/Takazudo/zudo-composer.git#c0b452da075b66757c60bd0d721a47062d4354d0` (package-root handoff commit).

### Inputs

- Original seed `Pinsel-Implementation-Seed-2026-10-12.zip`, SHA-256 `d9536f1b3a9fc982f6f99a64105b642db37025483be33e0f5b666a3f7f743bac`. Its fixtures are committed byte-exact under `tests/fixtures/approved-seed/` and hash-pinned by `tests/approved-seed.sha256.json` (83 files; 82 match the seed package).
- Approved visual source `1d5eff1b6a671cf3145cb849160b0a12b36411c7` (the seed prototype). R7-10 SHA-256 `9b51ee958846515f0327ceb5406a4a9f84e49ff7000028a634498f7a94f52a22`.
- Content authority Takazudo/yuko-site PR #4 @ `ce2ec05b9549c8f4b50a9ba01c201d8f88992348`, read-only and unchanged.

### The revised handoff package was not supplied

`Pinsel-Local-Agent-Plan-2026-10-12.zip` (with `cloudflare-authoring.md`, `composer-audit.md` and `zfb-sg-css-audit.md`) was never available to the implementing sessions. This is how the gap was covered:

- The Cloudflare authoring specification is reproduced in full in this issue's body, which was implemented as written.
- The Composer audit and the ZFB / zudo-sg / CSS audit were rebuilt by fresh inspection of the upstream sources. The reports are in the maintainer's cclogs (`pinsel/explore/`).
- The original seed was the only package used (402/402 payload checksums). Every `prototype/...` path resolves directly under it.

### Dependency identities (`docs/dependencies.md`)

| Package | Identity |
| --- | --- |
| `@takazudo/zfb`, `zfb-runtime`, `zfb-md-wasm` | 4.4.0 |
| `@takazudo/zudo-sg` | 0.5.4 |
| `@takazudo/zudo-doc` | 6.1.1 |
| `@takazudo/zdtp` | 0.8.6 |
| `wrangler` / `@cloudflare/vitest-plugin` | 4.149.0 / 1.4.0 |
| `jose` | 6.2.12 |
| `vite` / `preact` | 8.3.4 / 10.29.8 |
| `vitest` / `@playwright/test` / `axe-core` | 4.1.11 / 1.64.0 / 4.14.0 |
| `zudo-composer` / `@zudo-composer/component-contract` | git `547b532e…` / git `c0b452da…` |
| Toolchain | Node 24 (`>=22.13.0`), pnpm 11.5.2 (corepack), `autoInstallPeers: false` |

### Verification

Where each report applies is listed in `docs/verification/index.md`. Historical local results are labelled as such, and none is claimed for the final head.

- Gate-1 (`docs/verification/gate-1.md`): one record across SG, editor and preview, D1 and no-JS ZFB HTML; workerd/ZFB parity; external git-pin install.
- Public site (`docs/verification/public-site.md`): strict checker 14/14; 84 screenshot pairs 0.00% against the prototype (historical); no-JS, keyboard, fragments, TOC, motion, contact, overflow, contrast; axe from the pinned axe-core; token cascade on three surfaces.
- CMS and publication (`docs/verification/cms.md`): persistence across restart, exact-snapshot preview and stale acknowledgements, production-entry auth probes against a fixture JWKS, typed refusals, concurrency and idempotency, two publications with an edit in between, external-change conflict and rebase, `integrated` never shown as `live`. Fake provider and recorded GitHub fixtures only.
- Changed-snapshot path at `03e7518`: a price and FAQ edit through the real Worker and publisher writer passed every content-validate and publication-validate step. The edited values were on `/`, `/lessons/` and `/faq/`. The historical strict checker failed as designed and was not the gate, and the fixtures were untouched.
- Final head of PR #27: `TBD-after-merge` (head SHA, CI run URL, commands, results and skips with reasons).

### Open launch inputs (`docs/launch-inputs.md`)

Public and admin hostnames; Access team domain, AUD tag, One-time PIN enablement and editor allowlist; D1 database ids and the remote migrations (never applied); publisher credentials, promotion policy, required checks and branch protection (`main` is unprotected; suggested: `content-gate`, `approved-seed`, `build`, and `content-validate` + `pinsel/publication-identity` for content PRs); a scheduled reconciliation cron; the Cloudflare build/deployment connection (not connected); indexing/canonical (`noindex` now); contact delivery provider and recipient; and the removal of the unused `PINSEL_MIGRATION_CHECKER` repository variable.

### Limitations

- zudolab/pinsel#26 stays open: at 390px with 150% text, `/contact/` overflows by 8px, as the approved prototype does. A fix changes approved component CSS and needs a design decision.
- Publication was exercised only with the in-memory fake provider and recorded GitHub responses. The fake loses its records on a Worker restart, so restart recovery against a provider that keeps its state is proven in workerd tests, not in a browser run.
- The reference-only browser checks (no-JS copy parity and the prototype token measurement) skip in CI, because the approved reference dist is not in the repository. They pass when `PINSEL_REFERENCE_DIST` points at the extracted seed.
- No live test was performed: Access, remote D1, GitHub publication, Workers Builds and contact delivery.

### Issue states

`TBD-after-merge`: #17, #18 and #19 are closed only where their own criteria are met at the merged head. #1 and #2 are updated with this evidence. Takazudo/zudo-composer#903 / #904 stay open.
