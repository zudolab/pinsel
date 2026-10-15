# Dependencies

Every direct dependency is pinned in the workspace `package.json` files and resolved once in `pnpm-lock.yaml` (pnpm 11.5.2, `autoInstallPeers: false`). Only the lockfile owners named in `CLAUDE.md` change these pins.

Resolved 2026-10-12 with `corepack pnpm install`; registry state checked with `npm view <name> dist-tags` the same day. Final pin (#16, 2026-10-13): `zudo-composer` moved to `547b532e…` and `@takazudo/zudo-sg` to `0.5.2`; every other identity is unchanged. Zudo deps bump (#22, 2026-10-13): the zfb family moved to `4.3.3` and `@takazudo/zudo-doc` to `6.1.1`; `@takazudo/zudo-sg 0.5.2` and `@takazudo/zdtp 0.8.6` were already the newest releases. Post-merge bump (#19, 2026-10-13): the zfb family moved to `4.4.0` and `@takazudo/zudo-sg` to `0.5.4`; `@takazudo/zudo-doc 6.1.1` and `@takazudo/zdtp 0.8.6` are still the newest releases, and both Composer git pins are unchanged.

## Resolved identities

| Package | Specifier | Resolved | Importers | Integrity |
| --- | --- | --- | --- | --- |
| `@playwright/test` | `1.64.0` | 1.64.0 | `.` | `sha512-oTN9FNYuN6bqQMwiho6jJKLCG2/QOYCixGXuCjRmzOq23eODeukuY2XiAVoVpAECbuezMt1MHQjAiQxK8F+Y+g==` |
| `@types/node` | `^22.20.5` | 22.20.5 | `.` | `sha512-U2+DNr+wSjpsTS/wZGYHq7GcwfuSmKiKvoPvK22zwTlRhU91yOniN4qRR5KhIjvif7ysw/dz/hKmfDH0Ris4aA==` |
| `happy-dom` | `20.14.6` | 20.14.6 | `.` | `sha512-5DDsf4QmEIlRL6NkCv/fxSjYHHkZceL/IaYQdJc2h3G7DRTEai++VTjbfL0LB9geW2VrA3+vrjF3Efx+OTtX0Q==` |
| `typescript` | `^5.9.3` | 5.9.3 | `.` | `sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==` |
| `vitest` | `4.1.11` | 4.1.11 | `.`, `apps/authoring-worker` | `sha512-fhACrNXUidIbGSBr5FlbuBkO7VWC1ZyLl0DO4CU2DrQoAPxX84Ysxs+HeGQpii5lZWV1Q4gBZTTu49mF+A6Edw==` |
| `jose` | `6.2.12` | 6.2.12 | `apps/authoring-worker` | `sha512-9NiFmJEex0sy2Dk58j2UGBSHgUs2ypF9eZSu4L6vjOX3Dp96Sw1F3uL+H+D1sx02jZZdzUT0HgvCy59CuvXcWw==` |
| `zod` | `^4.3.6` | 4.6.5 | `apps/authoring-worker`, `apps/styleguide`, `packages/pinsel-content` | `sha512-v5l/aFXZQeai4awLbOpSoHecE9UiMrnfx75tEXLjNonXVARxQ5mOeipTjROUchszUNCqnE+hqAMujRsRHsut2Q==` |
| `@cloudflare/vitest-plugin` | `1.4.0` | 1.4.0 | `apps/authoring-worker` | `sha512-SgIhyhpVH+2MVSJxidG8gosqrpzF25IwKevQhPykwulTgAFe4s0Nkj71pNzqCkwV2+A4NKkHJP2ReyyRsoIxsg==` |
| `wrangler` | `4.149.0` | 4.149.0 | `apps/authoring-worker` | `sha512-OzK7xmB5r5iLKb3cIT3783g13fe6T7xyeKu9LEdUyl+DKAM2KP/jkjnE0OUhyw+mB/XJM9ycjgF3MWm8PR9amg==` |
| `@zudo-composer/component-contract` | `git+https://github.com/Takazudo/zudo-composer.git#c0b452da075b66757c60bd0d721a47062d4354d0` | 1.0.0 (git `c0b452da075b66757c60bd0d721a47062d4354d0`) | `apps/authoring-worker`, `apps/editor`, `packages/pinsel-content`, `packages/pinsel-ui` | `git-hosted, no integrity recorded` |
| `preact` | `^10.29.8` | 10.29.8 | `apps/authoring-worker` (dev, peer only), `apps/editor`, `apps/styleguide`, `packages/pinsel-content`, `packages/pinsel-ui` | `sha512-ej2aVZ+vZ8WO7tvlQWRM9N63A0KzF9q4mWJfDUHgYaIofWY9hu74QdnQrjoPMmZi2/nZ5gN0bJCQF49xQqx09Q==` |
| `zudo-composer` | `git+https://github.com/Takazudo/zudo-composer.git#547b532eb56dfecaec1e2bd9060f8d579ad8862c` | 0.0.0 (git `547b532eb56dfecaec1e2bd9060f8d579ad8862c`) | `apps/authoring-worker`, `apps/editor`, `packages/pinsel-content`, `packages/pinsel-ui` | `git-hosted, no integrity recorded` (codeload tarball `sha512-ftScClSN77f5t6ij1nvoJpblXdEnHTfgqTO/jNFnNPx1r5rCMzcxpRy4xtbDHlO2IOTDNBDsVqQB3CnzHbgx1Q==`) |
| `tsx` | `4.23.15` | 4.23.15 | `.` | `sha512-Yiex1Ovn8z2xPpOWckIiysV1SSyRMY9BkLF++q0yKiDxCqRhosKfMg3janKkiLBwZ5c/YryloKwGZcrEmtwxKw==` |
| `vite` | `^8.2.2` | 8.3.4 | `apps/editor` | `sha512-IftLE8phJhdNRIGNEV4JCCvfNScoZQVfcXaN8TQropWGJtOHcu+iAB9pHcuGvmEb/kddw0LBe/jS8ztdC6xdiQ==` |
| `@takazudo/zfb` | `4.5.2` | 4.5.2 | `apps/authoring-worker`, `apps/site`, `apps/styleguide`, `packages/pinsel-content`, `packages/pinsel-ui` | `sha512-WNJjp2q9oRXXxW3jVUJ8tSyHIvFprnX5v6s7ftgiidPGJsgeZUutLKH0Vl1nVnav4glcPJa8co1Wmb3afSp6jA==` |
| `@takazudo/zfb-runtime` | `4.5.2` | 4.5.2 | `apps/site`, `apps/styleguide` | `sha512-WrQhGVgiUnANolbTTGaIXOwi0hRjYWKThzAQw/816m2bIo2QmXSPoy0Il1/nMsyujkU9HPC/yWUcnu6FYD8wTA==` |
| `@tailwindcss/browser` | `4.3.2` | 4.3.2 | `apps/styleguide` | `sha512-R6hewP9HHwLAY88bFkgAYFIQMRGi9bqx6sR1anI3IThTJtwhPlAm4aHIzDKrnJ8Ct4M3d5A9PCsah8Z5+EjLiQ==` |
| `@takazudo/zdtp` | `0.8.6` | 0.8.6 | `apps/styleguide` | `sha512-powstLG6d4tkEroYbT6iAJk1Da4xAYS8+enW/bcn6IupkzQQf3agAtXrlJ8XVoWs43puOsCR5/hgpMDFKP3d3g==` |
| `@takazudo/zfb-md-wasm` | `4.5.2` | 4.5.2 | `apps/styleguide` | `sha512-qL7MfS1SUfLDfiADGjONyy2U79UzY/8J5H4cnMSCzGw5nDbeDvAGX0xEfgUgc7qg8Hn639Pf/EtObz6mkNtVQg==` |
| `@takazudo/zudo-doc` | `6.2.0` | 6.2.0 | `apps/styleguide` | `sha512-K8nfgSsZ48oKaK+osy21UgOWpuEw8XuPx9L5ZkyPTDCivwH5NCuli9nHW2zOfb9nQ7BRQblkmZFwgHM07YWQBQ==` |
| `@takazudo/zudo-sg` | `0.5.4` | 0.5.4 | `apps/styleguide` | `sha512-aVKkYdWce0An4ZpZXzxKiYK3s2xQ4ifapy1BeOcSNOEhV4+SQfQR2YuXa70IQ6dn8ztwETDE6kvkn7uMkhBliQ==` |
| `culori` | `^4.0.2` | 4.0.2 | `apps/styleguide` | `sha512-1+BhOB8ahCn4O0cep0Sh2l9KCOfOdY+BXJnKMHFFzDEouSr/el18QwXEMRlOj9UY5nCeA8UN3a/82rUWRBeyBw==` |
| `diff` | `^8.0.4` | 8.0.4 | `apps/styleguide` | `sha512-DPi0FmjiSU5EvQV0++GFDOJ9ASQUVFh5kD+OzOnYdi7n3Wpm9hWWGfB/O2blfHcMVTL5WkQXSnRiK9makhrcnw==` |
| `katex` | `^0.16.38` | 0.16.47 | `apps/styleguide` | `sha512-Eeo8Ys1doU1z+x8AZsPpQu+p/QcZBI5PeOo7QGQdy2x2m0MU/hYagBbGOmXwr5KVbEfVuWv9LpnQWeehogurjg==` |
| `tailwind-merge` | `3.6.0` | 3.6.0 | `apps/styleguide` | `sha512-uxL7qAVQriqRQPAyK3pj66VqskWqoZ37PW94jwOTwNfq/z9oyu1V+eqrZqtR2+fCiXdYOZe/Modt8GtvqNzu+w==` |

Both Composer packages are git-hosted (`resolution: { gitHosted: true }`), so pnpm records no integrity for them; their identity is the full commit SHA. The `zudo-composer` tarball digest above is `sha512` of `https://codeload.github.com/Takazudo/zudo-composer/tar.gz/<sha>`, for reference only. (Before #16 this row showed `zwitch@2.0.4`'s integrity by mistake.)

## Composer pins

| Package | Commit | Status |
| --- | --- | --- |
| `zudo-composer` | `547b532eb56dfecaec1e2bd9060f8d579ad8862c` | Final pin (#16) on `feat/903-hosted-content-authoring` (draft PR Takazudo/zudo-composer#904): milestone 2 (`7ca114a3`, the Gate-1 pin) plus `preview.sandbox` on the content-editor mount. Proved by `verify-root-git-install --sha 547b532e…` and `smoke:host-install -- --host hosted-content-host`. |
| `@zudo-composer/component-contract` | `c0b452da075b66757c60bd0d721a47062d4354d0` | Package-root handoff commit (`package/component-contract-v1`). |

Both are installed only as `git+https://github.com/Takazudo/zudo-composer.git#<full-sha>`. There is no npm release of `zudo-composer`.

## Published dependency refresh — 2026-10-15

Based on main `7b4aadbd2d42c2b307bca49855332f4916f42518` after PR #29. The channel-preserving resolver scanned eight manifests: the seven active workspace manifests plus the immutable approved-seed source manifest. All active pins track stable releases. The seed's historical `@takazudo/mdx-formatter ^1.0.3` is evidence, not an installed consumer, and remains byte-exact. Only the shared root lockfile exists; no independent nested install was omitted.

- ZFB, runtime and MD WASM: **4.4.0 → 4.5.2** together. The exact runtime peer is satisfied. Published tarballs and release tags `v4.4.0` (`29377d1c0bfd607dea6d654557e46ff7bf536b2e`) and `v4.5.2` (`57f625a2e3fc4bf69eb526c7bb8ef2103d4669d6`) were inspected; npm metadata has no `gitHead`. ZFB adds opt-in CSS compilation and ErrorBoundary APIs, fixes radio reset, public-asset dev serving and compact MDX tables; runtime fixes same-path query Back/Forward. Existing exports remain. MD WASM exports remain; published wasm bytes/digests change with the table fixes and release stamping. Pinsel does not pin wasm hashes or enable the new APIs. The public site's static output, the Worker's renderer and the styleguide are verified separately.
- zudo-doc: **6.1.1 → 6.2.0**, the newest published version compatible with zudo-sg 0.5.4's `^6.1.1` peer. Tarball changelog, public surface and release tag `zudo-doc-v6.2.0` (`6542b8300f4a554247563a3bac53e415a63ded51`) were inspected against `v6.1.1` (`e37130018ee2ca0bf71e39a639e328a9621d4659`); npm metadata has no `gitHead`. It raises ZFB peers to `^4.5.0`, fixes sidebar scroll/appearance and adds optional `scopeRoot`. The removed inherited `baseUrl` does not affect this host, which extends its own relative-alias tsconfig. No new option is enabled, and Mermaid is disabled here.
- **7.0.0 is published but held:** zudo-sg 0.5.4 rejects that major in its published peer contract; doc 7 also requires Node 24 and KaTeX `^0.18.2 || ^0.19.0`. Preserve this host's KaTeX 0.16.47 and independent editor/Worker stacks. Track the published compatibility decision in [zudo-sg#1009](https://github.com/Takazudo/zudo-sg/issues/1009#issuecomment-6196879481); a source merge alone does not satisfy it.
- zudo-sg **0.5.4** and zdtp **0.8.6** remain the newest published stable versions. The vendored scaffold pin remains `03a726f64ff0b26ac9f1aa746eb068a8ea7f4d03` (`v0.5.4`), the newest release; no template bytes or provenance date changed.
- Composer pins and all third-party versions remain unchanged. Release-age exemptions remain version-specific for the ZFB native/slugify packages, now `4.5.2`; the transitional old-or-new allowance was used only during installation.

## Historical pin decisions

- `@takazudo/zfb`, `@takazudo/zfb-runtime`, `@takazudo/zfb-md-wasm` are exactly `4.4.0` everywhere: `zfb-runtime@4.4.0` peers `zfb` at exactly `4.4.0`, `zudo-doc@6.1.1` needs zfb / zfb-runtime / zfb-md-wasm `^4.3.3`, and `zudo-sg@0.5.4` raises its zfb floor to `^4.4.0` (zudo-doc `^6.1.1`, zdtp `^0.8.6`). The install reports no missing or incompatible peers.
- zfb 4.4.0 impact (`v4.3.3..v4.4.0`, Takazudo/zudo-front-builder; changelog + published-tarball diff): the `zfb` npm package changes only its version pins (the binary ships in the native packages). The YAML frontmatter parser moves `noyalib` 0.0.53 → 0.0.55 (near-linear long flow collections; a verbatim `!<int>` tag is now refused, full-URI core tags are accepted, aliases deeper than 128 levels are refused); upstream states no previously accepted frontmatter changes value, and Pinsel content has no verbatim tags. `zfb-runtime` changes only `dist/client-router/router.js`: Back onto a browser-created fragment entry restores the earlier page, and the following Forward reports `forward`. The public site ships no client router (zero JS by default); only the styleguide's zudo-doc chrome loads it. The four `zfb-md-wasm` `.wasm` artifacts grow by under 3 KB and change SHA-256 because they embed the release version; Pinsel pins no wasm digest. Static HTML, `zfb check`, sitemap/robots, client-script entries and CSS handling show no change: `content:check`, `check-content.sh` (14/14), `check-publication`, `check-public-output` and the browser lanes pass unchanged.
- zfb 4.3.3 history: the only code change was the YAML frontmatter parser (`noyalib` 0.0.44 → 0.0.53, RUSTSEC-2026-0333).
- zudo-doc 6.1.x impact: 6.1.0 adds the opt-in `SidebarDefinition.initialPathMode` (unused here, default behavior unchanged) and stops persisting auto-expanded sidebar branches in `sessionStorage`; this is client-side styleguide chrome only. 6.1.1 only raises the zfb peer floor.
- `minimumReleaseAgeExclude` names the zfb native binaries and `zfb-slugify` by exact version (`@4.4.0`). Moving them to a new version needs a transitional install with both versions listed (`'@takazudo/zfb-…@<old> || <new>'`), because pnpm checks the old lockfile against the policy before resolving; the committed file lists only the new version (the #19 bump used `@4.3.3 || 4.4.0` for that install only).
- `@takazudo/zudo-sg` is `0.5.4` (published 2026-10-13). Against 0.5.2: 0.5.3 lets a catalog root sit beneath a symlinked ancestor directory (a symlink at or below the root is still rejected) and raises the peer floors to zfb `^4.3.3` / zudo-doc `^6.1.1`; 0.5.4 raises the zfb floor to `^4.4.0`. The public API is unchanged. `sg:check` (story shims, registry and token manifest through their generators) and `build:sg` stay green with no regenerated output.
- `@takazudo/zdtp@0.8.6` peers (`culori`, `preact`, `tailwind-merge 3.6.0`, `@tailwindcss/browser 4.3.2`) are declared explicitly in `apps/styleguide` because peers are not auto-installed.
- `diff ^8`, `katex ^0.16` and `preact ^10` follow the zudo-doc and Composer peer ranges, not the newer majors on npm (`diff 9`, `katex 0.19`, `preact 11`).
- `vite ^8.2.2` matches the `zudo-composer` dependency range, so the editor and Composer share one Vite. The editor builds with `contentEditorPlugins()` from `zudo-composer/vite` (Preact preset included), so `@preact/preset-vite` / `@babel/core` are no longer direct dependencies.
- `tsx 4.23.15` (root devDependency) runs the content pipeline scripts (`packages/pinsel-content/src/site/*.ts`), which import the zudo-react TSX of `@pinsel/ui`; Node cannot run the extensionless TypeScript imports natively. The scripts pass `--tsconfig tsconfig.scripts.json` so tsx applies the zudo-react JSX settings to files outside the package.
- `zudo-composer` and `@zudo-composer/component-contract` are declared by every package that imports them (`autoInstallPeers: false`): `packages/pinsel-ui` (pack manifest, route types), `packages/pinsel-content` (policy, authoring DSL, validators), `apps/editor` (editor mount), `apps/authoring-worker` (portable entries). `preact` is Composer's peer; the Worker declares it as a devDependency to satisfy the peer and `scripts/check-worker-bundle.mjs` proves the production bundle never imports it.
- `@cloudflare/vitest-plugin 1.4.0` replaces the deprecated `@cloudflare/vitest-pool-workers`. It depends on `wrangler 4.149.0`, which is also the direct pin, so there is a single miniflare/workerd install.
- `vitest 4.1.11` (V4 line) stays on the version zudo-sg and Composer test with. `5.x` is newer on npm.
- `pnpm dedupe --check` is clean and runs in CI. Duplicate `@lezer/common` identities break the zudo-sg code panel (zudo-sg#963).
- `happy-dom 20.14.6` matches the zudo-sg fixture; `21.x` (published 2026-10-11/12) is a new major and is not adopted yet.

## Known Composer gaps

Reconciled by the final pin (#16) against Takazudo/zudo-composer#903. Closed upstream: `preview.sandbox` (the editor no longer adds the attribute and reloads the shell). Still open, recorded on draft PR Takazudo/zudo-composer#904 as follow-ups; none blocks Pinsel, each has a working Pinsel-side handling:

| Gap | Pinsel handling |
| --- | --- |
| `ContentEditorPreviewOptions.route` names one route per mount | `apps/editor/src/editor-mount.tsx` remounts per route after a flush (refused while a conflict or failed save is open) |
| Content route chrome (directory, navigator, entry form, conflict banner) is fixed English; `labels` cover only the mount shell | `apps/editor/src/localize.ts` rewrites exact chrome strings |
| No directory/model grouping in the mount | `apps/editor/src/groups.ts` narrows the policy per group and remounts |
| No conflict actions on `ContentEditorHandle` | host panel explains the in-form Use latest / Reapply buttons; reload remounts |
| The mount shows raw export states (`exportStatus.state`) | `apps/editor/src/host.css` hides the mount's export chip; `publication.ts` shows Pinsel states |
| Global-template collection attachments are not materialised (every page root is a site-frame) | each route composition carries its own `pinsel.site-frame` |
| Single models cannot be attached | the five singletons are one-entry collections |
| `list<text>` / `list<long-text>` fields cannot bind to component props | five fields are `long-text`, one item per line |
| Collection conditions are static (no parent-relative filter) | per-year / per-group mappings are generated at assemble time |
| Restricted UI has no create / reorder, no completeness check before Submit; no SQLite two-process backend, two-publication trace or ZFB/SG parity upstream | Pinsel edits existing entries only; D1 conformance, publication trace and ZFB parity are proven in Pinsel (`docs/authoring-worker.md`, `docs/publication.md`) |
