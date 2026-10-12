# Content entries

Canonical Pinsel content records live here, one file per entry, grouped by content model (`content/entries/<model>/<id>.json`). Each file is a Composer `ContentEntryRecord` with values keyed by field id (`course-price`, not `price`).

Gate-1 seeds the `course` collection (3 entries). The content-migration sub-issue imports every other model through `scripts/content/import-seed.mjs`. Entries are the only files the CMS publication pipeline may change (plus `content/snapshot.json`).
