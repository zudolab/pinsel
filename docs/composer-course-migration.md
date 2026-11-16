# Staged course identity migration

This recipe migrates a reviewed native Pinsel `0.2.0` / `native-v1` capture into a
**separate** `0.3.0` / `native-v2` workspace. It does not import owner D1 data,
change the owner's running editor, deploy anything, or erase the original native
store and history. Check the [compatibility ledger](composer-compatibility.md) for
the exact installed Composer pin and actual acceptance results; source implementation
alone is not a recorded migration pass.

The [decision record](composer-course-identity-decision.md) explains ownership.
Course entry IDs supply read-only `courseId` through Mapping. Numeric query aliases
remain `1 → consultation`, `2 → two-month`, `3 → four-month`. New pricing links use
`?course=consultation`, `?course=two-month` or `?course=four-month`; Contact accepts
these exact IDs as well as the legacy numeric aliases. Newly authored UUID Course IDs
are supported too: canonical queries follow the public lowercase Content ID grammar
and are encoded in links. Numeric-equivalent IDs such as `01` or `1e0` are reserved
for the original aliases. Unknown or duplicate rendered identities never select a
fallback option. Contact selects an
option by `data-course-id`, preserving its editable label as the form value.
`order` controls Home/Contact arrangement, never identity. Consultation is pinned
to its existing qualified entry; tuition pins explicitly order `two-month` then
`four-month`. That tuition arrangement is independent of Content sort order.

## Capture and review the source

Save and stop the source editor. Before updating its pack/runtime, use the compatible
source revision and installed package to capture the actual native workspace:

```sh
pnpm --filter @pinsel/content authoring:capture -- /absolute/path/source.json
```

Record the printed digest and retain the capture with the original source checkout,
package identities, `.native-authoring`, `.native-public` and native history. A Git
seed export is not a substitute for this saved state. If you have already updated
the checkout without a compatible capture, preserve the store and recover the
compatible source runtime first; do not run `authoring:init` over existing data.

## Stage the reviewed capture

After installing the migration revision in the ledger, keep the original editor
stopped and run from the repository root, without `PINSEL_AUTHORING_STAGE` set:

```sh
pnpm --filter @pinsel/content authoring:migrate-course -- /absolute/path/source.json <reviewed-source-digest>
```

The command verifies the supplied digest and supported source shape, then uses the
public source-currentness API to compare the original workspace's coherent tokens,
project, Assets and public bytes. A changed source refuses migration. It creates
only previously absent destinations:

- `packages/pinsel-content/.native-authoring-course-identity-v1`
- `packages/pinsel-content/.native-public-course-identity-v1`
- `packages/pinsel-content/.native-course-identity-evidence.json`
- `packages/pinsel-content/.native-course-identity-snapshot.json`

All Content fields, values, excerpts and references are retained. The evidence
records source tokens, exact old/new identities, Content digest, every changed
project JSON pointer, changed generated public-file hashes and compiled routes.
The source is checked again after staging. Captured assets and CSS are preserved;
only the production visitor scripts are regenerated for identity-based selection.
Evidence and capture files stay outside the public directory.

Initialization spans separate stores and is not a cross-domain transaction. On a
failure, leave the original authority intact and retain any partial destination for
inspection; rerunning refuses existing paths instead of overwriting them. This
first migration deliberately refuses a source with managed Asset records, folders
or version files. Such a source needs a supported staged Asset import before this
recipe can proceed. The current known-data rehearsal has no managed Assets; its
committed public assets remain included and verified.

## Explicitly open the verified stage

Review the evidence: `sourceStillCurrent` must be true, the retained field/entry
counts must match the source, and the route/identity/public-file changes must be
the intended ones. Only then select the stage explicitly for this known-data
rehearsal:

```sh
PINSEL_AUTHORING_STAGE=course-identity-v1 pnpm dev
```

This environment variable selects both staged data and public assets. It does not
rename, copy over or activate the old store. Normal startup never seeds data. Without
the variable, the current checkout still points at `.native-authoring`; an old-pack
workspace must fail validation with migration/selection guidance rather than reset.
To recover the original editor, stop the staged server and reopen the retained source
checkout with its matching old package/renderer, without the stage variable.

Verify Home pricing links, Lessons Consultation and tuition membership, Contact
selection for all three canonical IDs and numeric aliases, shared price/label edits and local placement.
Reorder Home/Contact entries and Contact DOM options: aliases must retain meaning.
Save, stop and capture/build the reviewed stage through the same public commands:

```sh
PINSEL_AUTHORING_STAGE=course-identity-v1 pnpm --filter @pinsel/content authoring:capture -- /absolute/path/reviewed-stage.json
PINSEL_AUTHORING_STAGE=course-identity-v1 pnpm --filter @pinsel/content authoring:build -- /absolute/path/reviewed-stage.json
```

Restart with the same explicit stage variable and verify persistence. Neither this
recipe nor successful deterministic checks complete actual owner-data cutover or
authenticated AI-provider acceptance; those remain separate held tasks.

The post-import verifier compares all Content providers, model schemas, entry IDs,
values, lifecycle and metadata in the actual public capture against the source.
Only an existing positive entry `generation` resetting to `1` in the newly
initialized store is allowed; evidence records every such reset with its qualified
entry identity. Timestamps and all other metadata must remain unchanged. This
generation is distinct from the source store's physical transaction generation
and its public Content mutation token.
