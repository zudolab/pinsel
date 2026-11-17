# Explicit shared Content owners in native workspaces

Tracking: [T6 #55](https://github.com/zudolab/pinsel/issues/55).
The five models `site-copy`, `lessons-copy`, `about-copy`, `instructor-profile` and
`contact-copy` remain collections because nested Mapping attachments require
collection mode. Their shared presentations now use one qualified canonical entry
pin and limit1. Extra records are allowed unused Content; they cannot silently
replace the declared owner. This is not a singleton creation prohibition.

The old unpinned limit1 query selected the lowest eligible entry ID. An additional
published record could silently replace the intended owner. Missing source was
nonblocking. Explicit pins use existing public Composer query validation: an absent
or unpublished owner blocks compilation and the normal release checks. Content
creation/save itself remains possible; these are release/render safeguards, not a
new prewrite cardinality rule. Restore/republish the intended owner through supported
Content controls, or review an intentional Mapping retarget separately.

Fresh explicit `authoring:init` applies this native-only projection after Note
normalization. Historical source builders/fixtures are unchanged. Ordinary startup
never applies it. No schema, pack or renderer version changes are required: this is
an authored Mapping query change using an already supported field.

## Existing current native workspace: staged rehearsal

Do not execute while another writer owns the source. Stop/save the source, capture
it with its exact installed immutable package and `PINSEL_AUTHORING_STAGE=notes-v1`,
and review the returned digest. Retain the whole original store/history/releases.
Use a separately installed clean target checkout with the same pack/renderer identity;
its notes-v1 data and public roots must be absent. Do not initialize the target first.

The target's installed tooling runs this explicit script (no manifest alias needed):

```sh
PINSEL_AUTHORING_STAGE=notes-v1 pnpm --filter @pinsel/content authoring:capture -- /absolute/source.json
# The capture command above runs in the SOURCE checkout; the following in TARGET:
PINSEL_AUTHORING_STAGE=notes-v1 pnpm --dir packages/pinsel-content exec tsx \
  --tsconfig tsconfig.scripts.json src/site/stage-shared-sources.ts \
  /absolute/source.json <reviewed-digest> \
  /absolute/source-checkout/packages/pinsel-content /absolute/new-evidence-directory
```

Use the repository's Node24/pnpm11.5.2 toolchain and approved shared heavy guard
for the staged compilation/build. Do not use a sibling Composer implementation.
The script reads the public coherent capture, verifies its hash/current source,
validates/compiles the candidate before destination creation, and guards every new
destination. It uses public initialization/capture, never reads private domain
storage. It copies captured public bytes exactly without regenerating scripts.
Managed Assets (including an empty store with non-pristine Asset history) require
a supported importer and are refused before writes. The evidence directory parent
must already exist; symlink-resolved paths cannot overlap the source host.

Only the recognized historical Mapping identities and exact old query shapes are
converted. Already canonical pins are retained. Custom queries, unrecognized
shared-source Mappings, wrong owners, or multiple published candidates in a legacy
query refuse the whole migration before writes; review them explicitly instead of
choosing an owner by order. The staged candidate also applies the already reviewed [native model guidance](composer-adoption.md#native-model-guidance-description-metadata-only)
projection: only exact recognized legacy descriptions for nav-link, page-copy and
course are replaced, with every before/after text listed in evidence. Custom
descriptions remain unchanged. All entry values/lifecycles, including unrelated
drafts, remain exact apart from the documented new-store entry-generation reset.
Composition, Sitemap, attachments, binding targets, all other model metadata, IDs
and fields are preserved.
The original history stays with the source; this does not copy it into the new store.
Initialization is staged, not a cross-domain transaction. Preserve any partial output
on failure; do not reset/reseed to conceal it.

Review `intent.json`, `evidence.json` and `snapshot.json` in the exclusive evidence
directory. Evidence lists each before/after query and model description, source tokens, Content/project
hashes, initializer generation changes and final source-current check. Authority is
NOT switched. Run `authoring:build -- /absolute/new-evidence-directory/snapshot.json`
from the target, verify all captured assets/routes and representative shared values,
then restart only that explicitly selected staged workspace for browser checks.
Build directories are exclusive: if that snapshot was already built, retain and
inspect its existing proof rather than rebuilding over the directory. A subsequent
authoring scenario captures a new reviewed state and uses its own output directory.
Actual cutover, owner D1 data, remote deployment and inference remain separately held.

## Required acceptance and recovery

Pure tests cover all five models, old-output equivalence, extra draft/published
records leaving the declared owner unchanged, missing/unpublished pin refusal,
custom/ambiguous migration refusal, exact capture binding and unchanged Content.
The staged migration and exact build comparison passed at00bb/4f:14 identical HTML
routes and143 identical public files. The installed compiler also passed20 explicitly
synthetic missing/draft-owner and extra-record cases with unchanged canonical state.
See the [compatibility ledger](composer-compatibility.md) for exact identities.
These are not browser/release acceptance: actual local release refusal before
stage/activation remains required. Observe disposable
collection duplicate behavior as allowed unused Content, then delete only its
journaled record through supported UI; never claim New Entry is disabled.

Before any activation retain the source authority. If staged validation fails,
continue using that untouched source. After an explicit later authority switch,
any rollback needs fresh capture/conflict review; do not copy raw files or activate
two writers. No migration or authority switch is performed by reading this recipe.
