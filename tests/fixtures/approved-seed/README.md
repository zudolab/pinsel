# Approved seed fixtures

These files are **immutable migration gates**. They are never shipped, never edited and never regenerated. If a check against them fails, fix the implementation, not the fixture.

## Provenance

- Seed package: `Pinsel-Implementation-Seed-2026-10-12.zip`, SHA-256 `d9536f1b3a9fc982f6f99a64105b642db37025483be33e0f5b666a3f7f743bac`.
- Content authority: yuko-site PR #4 @ `ce2ec05b` (read-only).

| File | Seed path |
| --- | --- |
| `expected-content.json`, `check-content.py`, `content.json`, `page-manifest.json` | `prototype/src/` |
| `routes.json`, `asset-manifest.json`, `source-baseline.json` | `references/` |
| `source-content/` (75 files) | `prototype/src/source-content/` |

## Uses

- `check-content.py` is the strict content-parity checker (`scripts/check-content.sh`).
- `asset-manifest.json` is the sha256 authority for `pnpm assets:verify`.
