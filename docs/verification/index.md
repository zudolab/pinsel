# Verification index

Each report records the commit it tested. A result holds only for that commit. A later head needs its own run, and a historical local result is never evidence for a newer head. Nothing listed here involved a deployment, a live Cloudflare or GitHub request, or a real inquiry.

| Report | What it proves | Tested on |
| --- | --- | --- |
| [gate-1.md](gate-1.md) | Gate-1 (zudolab/pinsel#7): one canonical record (`course` as the home pricing cards) works across zudo-sg, the Composer editor and preview, the D1 API (upstream storage conformance on real local D1) and no-JS ZFB HTML. Also covers byte parity between the workerd preview and ZFB, the external git-pin install, and 28 `wrangler dev` behaviours. | `pinsel-site-cms/gate1` @ `489953dd` (base `9ab6d86`), Composer `7ca114a3`. Historical: the pack, digest and route figures were superseded by the wave-4 reconcile (noted in the report). |
| [public-site.md](public-site.md) | The public site against the approved prototype (zudolab/pinsel#17): fresh-clone build, strict checker 14/14, 84 screenshot pairs at 0.00%, no-JS, keyboard, fragments, TOC, motion, contact, overflow and zoom, contrast, axe, isolation. Two fixes: token layers and accessible names. | Historical local results: `pinsel-site-cms/confirm-site`, base `532bb8d`, fixes verified at `6b1199f`. Post-merge sections: PR #27 lanes and the final-head placeholder. |
| [cms.md](cms.md) | The CMS and publication slice (zudolab/pinsel#18): persistence across restart, preview identity and stale acknowledgements, 58/58 production-entry auth probes, typed refusals, concurrency and idempotency, snapshot immutability, the publication state machine (fake provider), content-validate on an edited snapshot, boundaries, external install. Four fixes (F1–F4). | Historical local results: `pinsel-site-cms/confirm-cms`, code `44208b1`, regression at `41f60c9`, base `532bb8d`, Composer `547b532e`. Post-merge sections: PR #27 lanes, the changed-snapshot re-run at `03e7518`, and the final-head placeholder. |
| [issue-1-report.md](issue-1-report.md) | The completion report to post on zudolab/pinsel#1, as required by epic #2: PRs, merge SHAs, upstream PR and pins, dependency identities, verification summary, open launch inputs, limitations and the missing revised handoff package. | Filled in by the manager after the PR #27 merge (`TBD-after-merge` placeholders). |

## Post-merge integration lanes (PR #27, branch `fix/pinsel-post-merge-confirmation`)

These are local lane branches merged into the integration branch. Their results hold for the lane commits, not for the final head.

| Lane | Commit | Scope | Recorded on |
| --- | --- | --- | --- |
| Recovered confirmation work | `5b95a24`, `325321e` | merged as-is from the original checkout's local commits `ae767f0`, `a96eaed`, `3f31dc0`, `4b328fa` (with `f28bbdb`) and `41d79d1` | zudolab/pinsel#19 |
| Public / accessibility | `43917cb` | axe-core 4.14.0 pinned and always run, visible-text names, token cascade on three surfaces | zudolab/pinsel#17 |
| Approved seed and content gate | `f9b7047` | hash manifest of all 83 fixture files, unconditional migration checker, fail-closed `content-gate` | zudolab/pinsel#19 |
| Dependency refresh | `64afe4f` | zfb family 4.4.0, zudo-sg 0.5.4, `ZUDO_DEPS_PINS.md` | zudolab/pinsel#19 |
| Docs and changed-snapshot path | this branch, on `03e7518` | README, architecture, launch inputs, this index, the #1 report; edited price and FAQ through the real publisher path | zudolab/pinsel#19 |

## Final-head results

> **Placeholder — filled in by the manager after the final run on the PR #27 head.** Record the head SHA, the CI run URL, and every command with its result and its skips (with reasons). Do not copy lane or historical numbers here.

- Head: `TBD`
- CI run: `TBD`
- Results: `TBD`
