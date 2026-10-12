# Dependencies

Every direct dependency is pinned in the workspace `package.json` files and resolved once in `pnpm-lock.yaml` (pnpm 11.5.2, `autoInstallPeers: false`). Only the lockfile owners named in `CLAUDE.md` change these pins.

Resolved 2026-10-12 with `corepack pnpm install`; registry state checked with `npm view <name> dist-tags` the same day.

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
| `zudo-composer` | `git+https://github.com/Takazudo/zudo-composer.git#7ca114a3ed7dcef10f5420dcc1894ea7125e4da6` | 0.0.0 (git `7ca114a3ed7dcef10f5420dcc1894ea7125e4da6`) | `apps/authoring-worker`, `apps/editor`, `packages/pinsel-content`, `packages/pinsel-ui` | `sha512-bXE4cR/kVZhKZX/RjPEflHaKVhUVl85noU3v6b8apfQEc1x4A+zBxjZ4lN8LqGd6WZ3dl98pY4o717VFmoPp+A==` |
| `tsx` | `4.23.15` | 4.23.15 | `.` | `sha512-Yiex1Ovn8z2xPpOWckIiysV1SSyRMY9BkLF++q0yKiDxCqRhosKfMg3janKkiLBwZ5c/YryloKwGZcrEmtwxKw==` |
| `vite` | `^8.2.2` | 8.3.4 | `apps/editor` | `sha512-IftLE8phJhdNRIGNEV4JCCvfNScoZQVfcXaN8TQropWGJtOHcu+iAB9pHcuGvmEb/kddw0LBe/jS8ztdC6xdiQ==` |
| `@takazudo/zfb` | `4.3.2` | 4.3.2 | `apps/authoring-worker`, `apps/site`, `apps/styleguide`, `packages/pinsel-content`, `packages/pinsel-ui` | `sha512-QTEQgD6pomJ7pnEyFL6GX7NuhstChEjcdzE46X0YWF3H8KiD3Ky17/IJs6d5/YGjmxgCyb2r9AHpbs5Jqn3+oA==` |
| `@takazudo/zfb-runtime` | `4.3.2` | 4.3.2 | `apps/site`, `apps/styleguide` | `sha512-30rubZuXmPJUVbrPCLTVyL/eREQ3M4av7xNJ98kVJA5ygn8Q3lBTtKHwkM23d6MD6csfcSuWfS2KORpV9t7TRA==` |
| `@tailwindcss/browser` | `4.3.2` | 4.3.2 | `apps/styleguide` | `sha512-R6hewP9HHwLAY88bFkgAYFIQMRGi9bqx6sR1anI3IThTJtwhPlAm4aHIzDKrnJ8Ct4M3d5A9PCsah8Z5+EjLiQ==` |
| `@takazudo/zdtp` | `0.8.6` | 0.8.6 | `apps/styleguide` | `sha512-powstLG6d4tkEroYbT6iAJk1Da4xAYS8+enW/bcn6IupkzQQf3agAtXrlJ8XVoWs43puOsCR5/hgpMDFKP3d3g==` |
| `@takazudo/zfb-md-wasm` | `4.3.2` | 4.3.2 | `apps/styleguide` | `sha512-g744sQDNcrSa8akp1XNSRfQ2EglHsN5FnfVZ4JOtbOLGuzb9TPhC04Q0BjdS2mxgcgdVzyk/4QJFlIWwM9npRQ==` |
| `@takazudo/zudo-doc` | `6.0.2` | 6.0.2 | `apps/styleguide` | `sha512-0RNBXQKnXH85WoaPbAqG+dhLnlJlvPCHi/XNs2lyAaEtuGLOce9ZM1ghndbCUUKS4GwNh5t7whEYj9uLl080zw==` |
| `@takazudo/zudo-sg` | `0.5.1` | 0.5.1 | `apps/styleguide` | `sha512-GEljBkKbBjIBdeGBLkNkJKdUgqbXyv17ufc/U5px/YyfDYCyAN/8diYtSxRzjETv+f39GSR+I6cbbhMXTpCfhA==` |
| `culori` | `^4.0.2` | 4.0.2 | `apps/styleguide` | `sha512-1+BhOB8ahCn4O0cep0Sh2l9KCOfOdY+BXJnKMHFFzDEouSr/el18QwXEMRlOj9UY5nCeA8UN3a/82rUWRBeyBw==` |
| `diff` | `^8.0.4` | 8.0.4 | `apps/styleguide` | `sha512-DPi0FmjiSU5EvQV0++GFDOJ9ASQUVFh5kD+OzOnYdi7n3Wpm9hWWGfB/O2blfHcMVTL5WkQXSnRiK9makhrcnw==` |
| `katex` | `^0.16.38` | 0.16.47 | `apps/styleguide` | `sha512-Eeo8Ys1doU1z+x8AZsPpQu+p/QcZBI5PeOo7QGQdy2x2m0MU/hYagBbGOmXwr5KVbEfVuWv9LpnQWeehogurjg==` |
| `tailwind-merge` | `3.6.0` | 3.6.0 | `apps/styleguide` | `sha512-uxL7qAVQriqRQPAyK3pj66VqskWqoZ37PW94jwOTwNfq/z9oyu1V+eqrZqtR2+fCiXdYOZe/Modt8GtvqNzu+w==` |

`@zudo-composer/component-contract` is a git package with a `prepare` build, so pnpm records no tarball integrity for it; its identity is the full commit SHA.

## Composer pins

| Package | Commit | Status |
| --- | --- | --- |
| `zudo-composer` | `7ca114a3ed7dcef10f5420dcc1894ea7125e4da6` | #903 milestone-2 commit on `feat/903-hosted-content-authoring` (draft PR Takazudo/zudo-composer#904), pinned by Gate-1 (#7). Gate-1 needed no upstream change. The upstream-reconcile sub-issue (#16) rebumps it to the reviewed SHA. |
| `@zudo-composer/component-contract` | `c0b452da075b66757c60bd0d721a47062d4354d0` | Package-root handoff commit (`package/component-contract-v1`). |

Both are installed only as `git+https://github.com/Takazudo/zudo-composer.git#<full-sha>`. There is no npm release of `zudo-composer`.

## Pin decisions

- `@takazudo/zfb`, `@takazudo/zfb-runtime`, `@takazudo/zfb-md-wasm` are exactly `4.3.2` everywhere: `zfb-runtime@4.3.2` peers `zfb` at exactly `4.3.2`, and `zudo-doc@6.0.2` raises its zfb floor to `^4.3.2`.
- `@takazudo/zudo-sg` stays at `0.5.1` although `0.5.2` was published on 2026-10-12. 0.5.2 only changes the engine's own dependency and TypeScript tooling, with the same peers. The bump is left to the final-pin sub-issue.
- `@takazudo/zdtp@0.8.6` peers (`culori`, `preact`, `tailwind-merge 3.6.0`, `@tailwindcss/browser 4.3.2`) are declared explicitly in `apps/styleguide` because peers are not auto-installed.
- `diff ^8`, `katex ^0.16` and `preact ^10` follow the zudo-doc and Composer peer ranges, not the newer majors on npm (`diff 9`, `katex 0.19`, `preact 11`).
- `vite ^8.2.2` matches the `zudo-composer` dependency range, so the editor and Composer share one Vite. The editor builds with `contentEditorPlugins()` from `zudo-composer/vite` (Preact preset included), so `@preact/preset-vite` / `@babel/core` are no longer direct dependencies.
- `tsx 4.23.15` (root devDependency) runs the content pipeline scripts (`packages/pinsel-content/src/site/*.ts`), which import the zudo-react TSX of `@pinsel/ui`; Node cannot run the extensionless TypeScript imports natively. The scripts pass `--tsconfig tsconfig.scripts.json` so tsx applies the zudo-react JSX settings to files outside the package.
- `zudo-composer` and `@zudo-composer/component-contract` are declared by every package that imports them (`autoInstallPeers: false`): `packages/pinsel-ui` (pack manifest, route types), `packages/pinsel-content` (policy, authoring DSL, validators), `apps/editor` (editor mount), `apps/authoring-worker` (portable entries). `preact` is Composer's peer; the Worker declares it as a devDependency to satisfy the peer and `scripts/check-worker-bundle.mjs` proves the production bundle never imports it.
- `@cloudflare/vitest-plugin 1.4.0` replaces the deprecated `@cloudflare/vitest-pool-workers`. It depends on `wrangler 4.149.0`, which is also the direct pin, so there is a single miniflare/workerd install.
- `vitest 4.1.11` (V4 line) stays on the version zudo-sg and Composer test with. `5.x` is newer on npm.
- `pnpm dedupe --check` is clean and runs in CI. Duplicate `@lezer/common` identities break the zudo-sg code panel (zudo-sg#963).
- `happy-dom 20.14.6` matches the zudo-sg fixture; `21.x` (published 2026-10-11/12) is a new major and is not adopted yet.
