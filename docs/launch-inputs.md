# Launch inputs

Decisions and identifiers needed before Pinsel can launch. None of them is decided yet. Until each one is filled in here, code and config use placeholders and never guess it.

| Input | Needed by | Decision |
| --- | --- | --- |
| Public hostname | public site Worker, canonical URLs | _undecided_ |
| Admin (authoring) hostname | authoring Worker, Access application | _undecided_ |
| Cloudflare Access team domain | JWT issuer / JWKS URL (`TEAM_DOMAIN`) | _undecided_ |
| Access application AUD tag | JWT audience (`POLICY_AUD`) | _undecided_ |
| Editor allowlist (emails) | Access Allow policy | _undecided_ |
| D1 database ids (production, preview) | `d1_databases` in `apps/authoring-worker/wrangler.jsonc` | _undecided_ |
| Publisher credentials | Git publisher adapter (content-only branch/PR) | _undecided_ |
| Promotion policy | how a publication PR becomes live (who merges, checks required) | _undecided_ |
| Indexing / canonical | `robots.txt`, `meta robots`, canonical/OGP policy at launch (the approved preview is `noindex`) | _undecided_ |
| Contact delivery | where inquiries go (the approved contact form is a local simulation) | _undecided_ |
