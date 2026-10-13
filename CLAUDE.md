# Pinsel — repository rules

## Ownership

- The lockfile, the root `package.json` and `pnpm-workspace.yaml` are owned by the manager. Only the sub-issues that are explicitly assigned to change pins may change them: foundation, Gate-1 pin, final pin, and a final-integration re-pin. Any other work reports a missing dependency instead of adding it.
- After any pin change, update `docs/dependencies.md`, then run `pnpm install --frozen-lockfile` and `pnpm dedupe --check`.

## Hard rules

- **No deployment.** Never run `wrangler deploy` without `--dry-run`, `wrangler versions deploy` or `wrangler publish`, and do not connect Workers Builds. `pnpm no-deploy:check` enforces this for scripts and workflows.
- No secrets in the repo or in CI. No real email or inquiry delivery.
- **Composer is consumed only via git pins**: `git+https://github.com/Takazudo/zudo-composer.git#<full-sha>` plus its public exports (`zudo-composer/<subpath>`, `@zudo-composer/component-contract`). Never use `zudo-composer/src/...`, `file:`, `link:`, `workspace:` or sibling paths.
- **Fixtures are immutable.** `tests/fixtures/approved-seed/` is a set of migration gates. Never edit, regenerate or weaken it, or the checks that read it. `pnpm check:approved-seed` hash-checks every file against `tests/approved-seed.sha256.json`.
- **Assets are exact.** `packages/pinsel-ui/public/` and `packages/pinsel-ui/src/art/` are byte-exact copies of the approved seed. `pnpm assets:verify` must stay green. `apps/site/public/` and `apps/authoring-worker/dist-assets/` are generated: only `scripts/assets/sync.mjs` writes the first, and only `scripts/assets/assemble-worker.mjs` writes the second.
- **Public-output exclusions.** Never ship these in public output: `font-provenance.json`, anything from `tests/fixtures/`, the seed `provenance/` files, `content.json`, `expected-content.json`, `check-content.py`, `page-manifest.json`, `source-content/`, `dist/__zfb/routes.json`, or any review-only query/postMessage plumbing.
- No Git LFS, no ZIP files, and no edits to `_old_pinsel` or `yuko-site`.

## Workspace

- Package names are `@pinsel/<name>`. Apps match their directory (`--filter site`, `--filter authoring-worker`). The packages are `@pinsel/ui` (`packages/pinsel-ui`) and `@pinsel/content` (`packages/pinsel-content`).
- Heavy local runs (Playwright, long builds) go through `bash $HOME/.claude/scripts/heavy-guard.sh -- <command>`.
