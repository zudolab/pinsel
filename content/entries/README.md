# Content entries

Canonical Pinsel content records live here, one file per entry, grouped by content model (`content/entries/<model>/<id>.json`). Each file is a Composer `ContentEntryRecord` with values keyed by field id (`course-price`, not `price`).

All 246 approved records are imported from the seed by `node scripts/content/import-seed.mjs`, which also writes `content/baseline.json` (per-entry value and protected-field digests). Re-running it is a no-op; it never overwrites an entry the CMS changed since the baseline. Entries are the only files the CMS publication pipeline may change (plus `content/snapshot.json`).
