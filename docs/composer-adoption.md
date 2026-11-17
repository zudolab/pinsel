# Full Composer adoption and authority contract

Tracking: [parent #51](https://github.com/zudolab/pinsel/issues/51),
[T0 #52](https://github.com/zudolab/pinsel/issues/52). This phase supersedes the
content-only CMS scope of [historical #2](https://github.com/zudolab/pinsel/issues/2),
not its data, rendering, asset, revision or delivery guarantees. Historical
[PR #36](https://github.com/zudolab/pinsel/pull/36),
[PR #37](https://github.com/zudolab/pinsel/pull/37), `content-model.md` and
`dogfooding.md` remain evidence of the earlier model and runtime. Their restrictions
on structural authoring are not requirements for this new phase.

## Target and ownership

The normal authoring experience must be the independently installed full Composer:
Sitemap → route-backed page → nested semantic components → inspector and real
rendered preview. Internal compositions, mappings and patterns are not pages.
Pinsel supplies its actual component pack and `renderRouteDocument` through a
supported trusted host document renderer. Its `hostDocument.jsxImportSource` is
explicitly `@takazudo/zfb/zudo-react`; Composer evaluates that trusted document
graph separately from its Preact editor graph. Composer remains independent of ZFB;
a handwritten Preact duplicate or public-site framework conversion is not a solution.

Component instances have stable owner-qualified IDs, typed properties and constrained
named slots. Parents own arrangement and slot order; children own supported content
and presentation properties. Shared entities remain Content records referenced by
placed presentations. Show their owning source and affected uses. A live shared
reference differs from a detached pattern copy. Wrappers and decoration should not
be prominent CMS nodes merely because they exist in the DOM.

The integration manager owns dependency pins, root manifests, lockfiles and shared
schemas. Consumer code uses public immutable Git package exports only. Upstream
features count as delivered only after their Pinsel scenario passes against the
exact installed revision. Preserve independently authored Home excerpts and detail
records; similarity is not permission to merge them.

## Inspected baseline (2026-11-16)

The source/package identities are in [the ledger](composer-compatibility.md).
The fresh checkout had no pre-existing diffs or additional worktrees.

| Area | Actual source and behavior |
| --- | --- |
| Content | `content/entries/<model>/<id>.json`: 246 committed records across 25 models; these are known seed-derived data, not the owner's current saved draft. Models live in `packages/pinsel-content/src/models/`. |
| Structure | `packages/pinsel-content/src/site/structure.ts:buildPinselSite` creates compositions, Mapping records and Sitemap `main` with `defineSite`. `fragment()` creates many internal mapping compositions. |
| Generation | `site/assemble.ts` combines committed entries and structure into `.site-project/site-project.json` and `baseline.json`; `site/project.ts` writes `apps/site/data/routes.generated.ts`, `navigation.generated.ts` and `plan.json`. These are generated baseline/build artifacts. |
| Current editor | `apps/editor/src/main.tsx` mounts Hosted Content with record presentation, a flattened entry dropdown and model-based `guessRoute`. `createPinselHostedPolicy` permits fields only. |
| Renderer | `packages/pinsel-ui/src/render/render-route-document.ts` renders real ZFB zudo-react components, injecting route and sibling position; validates properties, slots, accepted children, versions and linked template outlets. |
| Assets | `packages/pinsel-ui/public/` and `src/art/` preserve approved bytes; sync scripts own generated site/Worker copies. |
| Persistence | `apps/authoring-worker/src/storage/hosted-storage.ts` atomically commits D1 head/receipts/revisions/snapshots with version guards. Migrations 0004/0005 preserve legacy data and AI proposals. |
| Recovery | `apps/editor/src/recovery.ts`, `main.tsx` and `note-ai.ts` preserve session checkpoints, receipt retries and guarded Undo. Malformed/unsupported checkpoints remain preserved. |
| Static output | `site/build-snapshot.ts` verifies Hosted snapshot digest/definition and renders saved projections into `.dogfood/builds/<id>/`; it does not rewrite Content or D1. It is not yet a whole-native-workspace capture path. |

The 14 baseline outputs are `/`, `/lessons/`, `/about/`, `/results/`, `/voices/`,
`/faq/`, `/notes/`, `/contact/`, `/404.html`, and `/notes/<slug>/` for
`exam-schedule`, `free-tuition`, `german-language`, `online-exam`, `what-is-mappe`.
Baseline route counts in `invariants.ts`, `project.ts` and `build-snapshot.ts` must
remain historical proofs while supported new routes receive separate validation.

## First slice and normalization inventory

See the [complete field inventory](composer-migration-inventory.md),
[qualified reference map](composer-migration-reference-map.json) and
[migration plan](composer-migration-plan.md). They describe the known-input baseline
and proposed transformations; the migration recipe records current implementation, and a fresh
public capture is required before any migration.

Lessons' `consultation` group attaches the Consultation presentation, whose nested
course region uses a stable qualified Course pin. Home pricing and Contact option
labels reference those same Content records. Parents own arrangement; shared
prices and labels remain Content-owned. Entry-ID bindings supply visitor identity,
while `course.order` controls Home/Contact display order. Existing numeric query
aliases keep their original meaning after reorder or relabeling.

The [normalization audit](composer-normalization.md) records current installed
capabilities and dispositions. Public DSL pins replace manual query patches;
semantic tree presentation reduces wrapper prominence without changing ownership.
Singleton-shaped collections, newline lists, repeated page-owned frames and some
per-group fragments remain for documented Mapping/schema reasons. They are not
permission to advertise unsupported creation or regenerate authored state. T6
retains the dynamic Note-detail, new-page and everyday group/structure scenarios.
Every old field/reference is preserved or explicitly transformed by the reviewed
migration; distinct Home excerpts remain independent authored Content.

## Authority and migration

Use one explicit writable native workspace for Composition, Content, Mapping and
Sitemap. Initialization from committed inputs is a staged import into a new location,
not ordinary startup and not a cross-store database transaction. Its destination
must not overlap generated `.site-project` files. Native inspection must not classify
newly authored data as source-authored merely because a build artifact exists.

A public coherent capture/export must bind workspace/schema identity, all four
domains, component/renderer identity and referenced Assets. Exact build input comes
from that reviewed capture. Detect concurrent change and refuse or retry; do not
assemble snapshots from unrelated private-file reads. Edit/save/restart/capture/build
must reproduce the reviewed state without reseeding it.

Actual cutover is held: no current owner D1 export or authorized reachable cutover
host was supplied. Known-data migration rehearsal is cloud-completable. For eventual
cutover: rehearse, fence legacy writes, capture and verify final revision, import into
staged state, validate content/references/rendering, then switch authority. On failure
retain the old store and restore its authority. Preserve old D1/history/snapshots as
read-only recovery material; never leave two active writers. This cloud task does
not switch the owner's active editor or authorize execution on another computer.

## Acceptance and retained checks

T1 proves nested single/many slots, fragments, route-aware navigation, positional
output and Content-derived regions through the real renderer; tree, inspector and
preview resolve one owner-qualified target. Acknowledgements bind exact revision,
route, renderer and pack. CSS/assets remain isolated and visitor interactions work.
T2 proves coherent capture, restart and exact build authority. T3 rehearses the Lessons
slice, shared Home pricing/Contact labels, local arrangement, reload/restart/build
persistence, and invalid ownership/slot refusal without writes. T4 completes the
migration map. T5 routes human and AI operations to real owners, stages before Apply,
refuses stale proposals and proves response-loss recovery and guarded Undo. Mixed
ownership requires proven atomicity or explicitly separate reviewed operations.
T6 covers every baseline route plus permitted creation/navigation/structural states.
T7 uses independent frozen installs, immutable pins and an independent reviewer
following documented recipes without prior conversation context.

Keep approved-seed hashes, exact asset checks, safe Markdown/URL/reference validation,
public-output exclusions, auth and revision guarantees. Keep a dedicated historical
14-route migration proof when replacing obsolete design-fixed runtime assertions.
Current CI has frozen-install/dedupe, no-deploy, assets, assembly/projection, site,
type/unit, styleguide/editor/Worker, authentication, snapshot rehearsal, browser and
unconditional migration-baseline gates. Tests are not passed merely by being listed.

No deployment, package publication, remote D1 mutation, domain change, real inquiry
or email delivery is authorized. Existing build/test automation may run; inspect
current workflows and repository gates before eligible merges.

## Provider evidence and holds

Historical Note AI real-CLI acceptance **passed** on 2026-11-08 at Pinsel
`b43135cedb01932ab7013d4b20be2d2c3eaa2275` with Composer
`fba434aaa96af8b4dbc2a086638180f71a2da741`, Claude Code 2.1.319,
`claude-cli`, model `opus`, effort `medium`:
[recorded rerun](https://github.com/zudolab/pinsel/issues/2#issuecomment-6718440733).
It covered staged body/title edits, actual preview, Apply, restart/Undo and conflicting
Undo refusal. Preserve that pass; earlier cloud NOT_RUN notes do not erase it.

The new full-adoption real-provider acceptance is **NOT_RUN**. Historical success
does not prove new ownership/structural operations or credentials in this cloud.
Run only with supported credentials/configuration actually available here, preserving
explicit model/effort/tier. A fake provider proves deterministic integration only.
Record missing capability and exact next action separately from actual-data,
environment, review or CI holds. Do not change credentials to bypass a blocker.

The in-product Assistant must receive architectural rules, selection, ownership,
references and generated capability grammar through its actual context/tool path.
This Markdown file alone does not establish that behavior.

## Staged native workspace recipe (implementation acceptance pending)

For an existing `0.2.0` / `native-v1` workspace, follow the
[explicit course-identity migration recipe](composer-course-migration.md). The new
pack does not make an old workspace compatible by itself. Preserve the original
store/history and select only a verified separate stage; do not rerun initialization.

`PINSEL_AUTHORING_STAGE` selects a directory suffix, not a schema version. The
current initializer always applies `normalizeNoteRoutes` to committed inputs and
creates the current pack `0.4.0` / renderer `native-v3` model, including when the
variable is unset and the default paths below are used. Setting `notes-v1` selects
`.native-authoring-notes-v1` and `.native-public-notes-v1`; use that same selection
for initialization, authoring, capture and build. A stage name does not convert
existing saved state. Older default or named workspaces still require the explicit
staged migration with a matching source runtime; startup never migrates or reseeds.
For a fresh named rehearsal, follow the [known-data bootstrap](native-authoring-acceptance.md#fresh-known-data-bootstrap-or-existing-saved-workspace).

After installing the exact Composer revision recorded in the compatibility ledger,
the following fresh-default example uses unsuffixed paths (all destinations must
be absent):

```sh
pnpm --filter @pinsel/content authoring:init
pnpm dev
```

Initialization is explicit and checks that the selected native data directory,
prepared public root and `.native-import-evidence.json` are all absent before
preparing files or importing stores. Existing files, directories and dangling
symlinks refuse without initialization writes. Keep other writers stopped: this
preflight is not an atomic reservation, and later initialization failures can leave
partial staged output that must be preserved for review. It stages committed
Content and `buildPinselSite` structure under
`packages/pinsel-content/.native-authoring`, prepares approved public assets and the
same production visitor script sources under `.native-public`, and records
`.native-import-evidence.json`. Neither command changes legacy D1 authority. Normal
`pnpm dev`, `pnpm dev:dogfood` and the underlying `authoring:dev` open full native
Composer. Startup uses public coherent capture to verify the existing saved workspace
and prepared public files before listening on loopback port 4190. It refuses missing,
incomplete or busy state and never initializes or reseeds stores. To choose a port,
run `pnpm --filter @pinsel/content authoring:dev --port 4191 --strict-port`.
Keep this staged authoring state
for restart testing; do not delete it as disposable output after editing.

The previous Hosted Content launcher remains explicitly available as
`pnpm dev:legacy-hosted` for legacy recovery work. It retains its documented D1
behavior; do not start it as an alternate writer during an actual authority cutover.
Changing the repository's normal command does not migrate owner data or switch an
already running owner editor. The staged native workspace still contains committed
known inputs until a separately authorized owner-data import is completed.

Open the displayed loopback URL, choose Sitemap `main`, Lessons and Consultation.
Check the nested section, intro and shared course-price ownership. Save, stop the
server, and capture through the supported offline API:

```sh
pnpm --filter @pinsel/content authoring:capture -- /absolute/path/pinsel-native.json
pnpm --filter @pinsel/content authoring:build -- /absolute/path/pinsel-native.json
```

Capture creates a new file exclusively, binding native domain tokens, actual pack
and renderer identities, managed Assets and the explicit prepared public-file list.
Build verifies that capture and writes a new `.native-builds/<digest>` directory,
using captured public asset/CSS/script bytes. Existing output is refused rather than
overwritten. Reopen the server and confirm saved edits remain unchanged by capture
and build. These commands are a recipe, not a recorded end-to-end pass; use the ledger
for actual installed-acceptance results.

## Native model guidance (description metadata only)

Fresh explicit `authoring:init` imports and the staged `authoring:migrate-notes`
output project the three recognized legacy descriptions for `nav-link`, `page-copy`
and `course` into native guidance. The projection matches the exact old text and
qualified `content-filesystem` model identity; custom descriptions are preserved.
It changes no fields, IDs, permissions, values, timestamps, Assets or historical
Hosted definitions/fixtures. Header membership/order is owned by Composition and
Mapping; Footer order uses Content `order`. Descriptions grant no new capability.
The Note migration evidence includes the exact description differences and hashes;
post-import Content verification compares against that reviewed candidate.

Existing native stages are **not updated on startup**. Do not reinitialize them or
edit private storage paths to update descriptions. An existing-stage change needs
a separately reviewed per-model save in the supported Model Editor, or the public
Content provider protocol (`read-all`, `get-model`, `transact`) with
`expectedMutationToken` and one `put-model` operation. Capture the whole workspace
before and after, preserve the complete model before-image, match its exact legacy
description and qualified identity, and change only `document.description` (plus
the normal save timestamp). Refuse stale tokens or custom text; preserve all other
model fields and all entries. Record the request before dispatch and reconcile a
lost response through public readback rather than blindly replaying a write.
Verify the expected Content token change, unchanged entry values/generations,
other domains and Assets, and the displayed guidance after reload/restart. Any
inverse requires the exact saved after-image and current token. This implementation
alone is not evidence that an existing stage or owner database was updated.
