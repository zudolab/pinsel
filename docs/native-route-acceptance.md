# Native route and publication acceptance

This extends [the portable acceptance runner](native-authoring-acceptance.md) and
[the Note migration contract](composer-note-migration.md). The staged migration and
exact fourteen-route build passed. Note/Course creation, local publication and the
fifteen-route production visitor check passed with Composer `bc20ea554d5d8de92934c9bf4ec989229d23047e`;
see the [pin-qualified compatibility ledger](composer-compatibility.md#first-native-publication-and-production-visitor-acceptance).
Static-page, Knowledge-reference and family scenarios remain incomplete, and the
current package's new value-policy acceptance is separate from that earlier pass.
`tests/native-authoring/routes.mjs` supplies UI helpers; it does not start a server,
initialize a workspace, select authority, or constitute a completed live scenario.

Use the reviewed `notes-v1` stage and immutable installed Composer pin. Stop other
writers. Capture the before state through `authoring:capture`, preserve its digest,
all existing entry IDs, route list, models and Content values. Use the portable
runner's scope-bound journal and exclusive artifact directory. Journal each intended
operation before sending it and each actual response/receipt afterward. Creation
journals the client-generated ID before forwarding the real UI request. An uncertain
response requires supported readback, never blind recreation.

## Note and Course creation

1. Open Content, select Note, choose **New Entry**. Record its actual new UUID.
   Set URL スラッグ to a unique readable slug different from that UUID, タイトル,
   説明, 本文（Markdown）, and 表示順. Save and reload the entry. Confirm it remains
   draft and the new visitor route is absent before publication.
2. Create a Course similarly; fill every required label, price, unit, excerpt,
   Contact option and order field. Keep deliberate Home and detailed excerpts
   distinct. Record this UUID; do not invent another duplicate identity field.
3. Open **Review & release** and inspect state. On a fresh initialized workspace,
   the activated baseline is empty: even previously published entries appear as
   new choices. For that first local activation select exactly the published
   identities from the reviewed before capture plus these two journaled new IDs.
   Never select all current checkboxes or unrelated drafts. On later activation,
   select only the explicitly intended changes. `publicationSelection` implements
   this distinction; the caller must verify the actual activated baseline.
4. Run release checks, approve, stage, build and **Activate locally**. Save actual
   results and publication reconciliation status. This creates a local release
   baseline and reconciles working Content; it is not deployment. The generic
   local release artifact is not the Pinsel ZFB exact-build proof.
5. Confirm actual entries now published. Navigate Sitemap → Notes → new dynamic
   detail; inspect heading, body, TOC, metadata and canonical URL. Assert selected
   Content ownership is the new UUID, while the route uses its different slug.
   The new Note must add one route to the original fourteen.
6. Select an existing Knowledge entry, journal its original reference, and change
   only リンク先の記事 to the new Note through its reference picker. Verify its
   independently authored excerpt is unchanged and its rendered link follows the
   new slug. Changing an existing Note slug changes its route; no redirect is
   automatically created. Do not rename existing public slugs during this test.
7. Confirm the new Course appears on Home and Contact with a canonical encoded ID
   query. Follow that link and assert exactly its option is selected and the form
   value remains the human label. Reorder without changing identity; old numeric
   aliases must still select their original three courses. Do not send an inquiry.
8. Stop the editor, capture through the public API and build that exact snapshot
   with `authoring:build`. Verify all baseline routes, the extra Note, all captured
   public asset hashes, metadata and visitor interactions. Restart and repeat the
   target ownership and selection checks. UI screenshots alone do not prove this.

## Explicit static page and hierarchy

Create an independent Composition using the ordinary Composition library's **New
composition** or **Duplicate composition** action, recording its ID and exact
before/after document. A duplicated Composition remains independent, but Mapping
attachments and shared Content must be inspected explicitly: duplication is not a
promise to clone the entire page graph. Native inspector insertion requires a
selected component with a declared slot; an empty root is not a slot. If ordinary
Composition root creation cannot create a real Pinsel semantic root, record that
specific product gap rather than writing private store files.

In Sitemap, add a child page under the intended parent, set its unique title/slug,
and assign that saved Composition through Source → Choose composition. Add a
page-copy Content entry for its exact compiled route, page title and meta description;
publish only that intended metadata change through the reviewed local pipeline.
Verify hierarchy and URL independently. Static pages are not automatically added
to the site's explicitly authored navigation; edit the supported navigation record
when inclusion is intended. Check canonical/title/description, nested owner-qualified
selection, a local semantic edit/save/reload, and a new exact static capture/build.

## Portable static-page sequence (source tooling; runtime NOT_RUN)

`tests/native-authoring/static/` implements the explicit static scenario above.
It uses the installed public Composer compiler and the actual Pinsel component pack;
no sibling source, private-store reads, initialization or owner drafts are inputs.
Use Node24/pnpm11.5.2, a clean committed frozen-install checkout and an explicit
existing disposable stage. Stop other writers and serialize runtime/build commands
through the environment's shared heavy guard and child-reaper.

First establish a local baseline with the [first-baseline recipe](composer-family-acceptance.md#fresh-stage-first-local-baseline-prerequisite),
then its standalone **active-identity** read-only restart. Keep its successful
`proof.json` and exact after capture. The initial static phase must begin at that
accepted capture; later phases use the exact immediately preceding proof. A fresh
stage, a guessed active identity or a generic screenshot does not meet this gate.

Write a config with a unique lowercase marker and the actual accepted active proof:

```json
{"marker":"static-acceptance-unique","activeProofPath":"/absolute/active-readback/proof.json"}
```

Create a JSON array of successful static `proof.json` paths, initially `[]`. The
preparer selects the next phase, derives qualified owners from the public capture
and prior proofs, and writes an exclusive intent:

```sh
corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/static/prepare.mjs \
  /absolute/config.json /absolute/accepted-capture.json \
  /absolute/proof-paths.json /absolute/new-intent.json
```

Review that intent, then run inside the shared guard/reaper:

```sh
corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/static/run-phase.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage EXISTING_STAGE --port 4194 \
  --intent /absolute/new-intent.json --artifacts /absolute/new-attempt
```

All flags are required. Artifacts must be outside the checkout and absent. Runtime
checks installed roots/lock, complete tracked source hashes, a new exact public
capture and frozen input hashes. The child consumes a parent-captured hash-checked
bundle rather than rereading a mutable intent. Original browser requests and exact
responses are durably journaled. Same-document navigation cannot satisfy the full
record readback after reload. Unknown operations or uncertain responses hold the
attempt; no automatic replay or inverse follows.

| Phase | Operation |
| --- | --- |
| 1–3 | Create independent Composition; insert semantic Section root; edit its title |
| 4–7 | Create child Sitemap page; set title; set slug; assign exact Composition |
| 8–9 | Create draft page-copy metadata; review and activate only that metadata |
| 10–12 | Add explicit Sitemap navigation item; set label; target stable new page |
| 13–15 | Reparent under About; update only metadata route; review and activate metadata |

Each successful phase writes `STATIC_PHASE_CAPTURE_VERIFIED` only after server
shutdown, complete public capture and exact allowed-domain delta. Append that
`proof.json` to the ordered array, use its `afterCapture`, and prepare the next phase.
The second publication derives its expected active identity from phase9's accepted
release receipt; live catalog/get must agree. Existing content and unrelated drafts
remain preserved. Sitemap navigation is distinct from Pinsel Header Content.

After the complete sequence, build its final accepted capture using Pinsel's
production renderer, then capture again into a new file. The latter must remain
byte-for-byte equal as a parsed snapshot. Do not rebuild an already-existing digest
output; retain its evidence and inspect it instead.

```sh
PINSEL_AUTHORING_STAGE=EXISTING_STAGE corepack pnpm --filter @pinsel/content authoring:build -- /absolute/final-after.json
PINSEL_AUTHORING_STAGE=EXISTING_STAGE corepack pnpm --filter @pinsel/content authoring:capture -- /absolute/fresh-after-build.json
corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/static/verify-static.mjs FULL_IMMUTABLE_COMPOSER_SHA \
  /absolute/all-15-proof-paths.json /absolute/fresh-after-build.json /absolute/new-static-route-proof.json
```

The verifier checks all15 ordered accepted phase artifacts, full capture deltas,
frozen input/event hashes, actual qualified page/Composition/metadata identities,
public compiled route, exact build-evidence identity, every captured public asset,
and production HTML title/Section heading. It produces the `staticRouteProof` used
by [Header href acceptance](native-header-acceptance.md). That proof does not claim
Header inclusion, a new browser restart, or production deployment. Retain authored
records and release history; deletion/recovery requires its own explicit reviewed
operation. Failed external pilot artifacts remain separate and must not be renamed
as successful portable phases.

Pure checks, without a server or native writes:

```sh
corepack pnpm exec vitest run --config tests/native-authoring/static/vitest.config.ts
```

The reduced `fixture.json` has an invalid capture digest and no usable Assets; it
is test data, never an import or build input. Source tests are not installed runtime
acceptance. Use the compatibility ledger for exact tested revision and result.

## Retained external-pilot state: verify without replay

A completed external pilot may contain successful phases, explicitly recovered
failed attempts and reviewed installation identity changes. Do not relabel them as
portable phase passes or recreate their records. The separate read-only retained
state runner consumes an ordered15-proof manifest:

```json
{"kind":"retained-static-evidence","proofPaths":["/absolute/phase01/proof.json","/absolute/recovered-phase02/recovered-phase-proof.json","...all remaining actual accepted phase proofs..."],"capturePath":"/absolute/accepted-final-capture.json"}
```

The example array is schematic; provide all15 actual ordered paths. The loader
checks each kind and digest chain, the original successful record/release response,
full accepted domain delta and owner allocations. Content evidence binds the qualified allocation, every ordered acknowledged save,
and the exact final record. Recovery requires the original failure journal, its
committed reconciliation and original after-capture, full unchanged recovery
before/after capture, and an exact paired public `get`/loaded-record response.
The historical page-create exception preserves its missing original after-capture
as a limitation and requires its acknowledged write and later capture-reconciliation
artifacts; it does not invent an original capture. Historical journals identify
fixed public adapters by their protocol-specific phase names; they do not contain
HTTP headers for every read. Unsupported event shapes refuse. Installation
changes permit only the four attested identity fields, require recorded public
pack/renderer identities, and validate an explicit bridge when supplied. Every
input is hashed and frozen for the child; original failure/recovery statuses remain
in the output. An incomplete sequence or caller-invented resource ID refuses.

With stopped writers and a clean committed frozen-install checkout, run inside the
shared guard/reaper:

```sh
corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/static/run-retained.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage EXISTING_STAGE --port 4194 \
  --intent /absolute/retained-manifest.json --artifacts /absolute/new-retained-check
```

This starts a fresh server/browser, admits only actual scoped reads and the existing
challenged derived-output protocol, and checks the exact captured host preview's
route, title, description, noindex and Section heading. It stops the server and
requires complete capture equality. It then builds the exact snapshot if no build
exists, or verifies the existing digest output without overwriting it; all public
compiled routes/assets, metadata, actual parent, old-root-route retirement and
production HTML are checked. A further public capture must remain identical.

Only then does `static-route-proof.json` contain
`COMPILED_AND_EXACT_BUILD_VERIFIED`, suitable for Header href acceptance. This is a
new read-only restart and exact production-build proof for retained state, **not**
a claim that all15 writes were repeated in the portable runner. It does not establish
baseline visitor interactions, Header inclusion or authenticated inference. Those
remain separate acceptance scenarios. No inverse or cleanup follows automatically.
The retained runner's installed runtime acceptance is NOT_RUN until executed.

## Results, FAQ, and singleton-shaped records

A new Results year or FAQ group does not imply a new placement. Inspect the actual
Mapping selection and parent slot, create the Content record, and place/reference
it through the supported Mapping/Sitemap/Composition UI. Record whether the existing
query automatically includes it or explicit pins/attachments are required. Verify
its heading, ordered children and affected routes; do not substitute unrelated
wrapper components. These live workflows are still pending. Historical model
counts describe seed data, not an enforced maximum.

A collection used as a singleton remains a collection unless its schema says
otherwise. New Entry/duplicate may therefore be available. Rehearse duplicate
behavior only with a journaled disposable record; ambiguous metadata or reference
resolution must refuse rather than silently select a record. Do not imply the UI
prevents duplicates without observing it.

## Recovery and evidence

Restore the Knowledge reference and any edited baseline fields first. Remove only
journaled new Sitemap pages and new Composition records using supported UI actions;
verify no surviving references before deletion. For published test entries, request
unpublish in Content, review/activate precisely those intents, and then delete the
now-unused entries through Content's confirmation dialog. Preserve release history,
receipts and the first local baseline. Logical restoration must compare every
original model/entry/value/lifecycle, exact original structure and references; any
store-generated metadata differences must be reported explicitly, not erased by a
broad normalizer. Keep an uncertain/incomplete inverse journal for recovery.

Evidence must identify the installed pin, workspace/renderer/pack identities,
before/after digests, actual generated IDs, releases/receipts, route counts,
screenshots, exact build output and retained resources. Real-provider inference,
owner D1 import/cutover and deployment remain outside this local rehearsal.
