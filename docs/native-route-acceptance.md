# Native route and publication acceptance

This extends [the portable acceptance runner](native-authoring-acceptance.md) and
[the Note migration contract](composer-note-migration.md). The staged migration and
exact fourteen-route build passed. Note/Course creation, local publication and the
fifteen-route production visitor check passed with Composer `bc20ea554d5d8de92934c9bf4ec989229d23047e`;
see the [pin-qualified compatibility ledger](composer-compatibility.md#first-native-publication-and-production-visitor-acceptance).
The [2026-11-20 checkpoint](composer-compatibility.md#package-s-installed-acceptance--2026-11-20)
records later static-page, Knowledge-reference and family passes at Composer
`e802741aaf51bae69b4db67ddc3d80494be61043`. See the [current ledger](composer-compatibility.md#current-candidate-at-a-glance) for the active pin and its coverage.
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

## Portable static-page sequence

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

The phase08 Content recovery format additionally requires an explicit
`recoveryFreezeManifests` map in this retained manifest, keyed by the absolute
recovered proof path and pointing to its independently reviewed freeze manifest:

```json
{"recoveryFreezeManifests":{"/absolute/recovery08/recovered-phase-proof.json":"/absolute/reviewed-preparation/freeze.json"}}
```

Merge that field into the complete manifest above. The adapter verifies its bytes
against both the recovered proof and execution manifest hash, every frozen input,
the hash-bound browser bundle, original five acknowledged commits, original full
captures and failed journal, and unchanged installed source/package identities.
It requires the exact paired public Content `get-entry` response and all four UI
fields in actual recovery artifacts. The original failed phase remains failed.
Missing artifacts, caller-invented resource IDs, or a success status alone refuse.
Synthetic test fixtures validate this format; they do not constitute a completed
installed recovery. Actual recovery and the full retained runner remain separate
runtime acceptance requirements.

### Phase08 read-only Content recovery runner

`static/run-phase08-recovery.mjs` produces exactly that evidence for a portable
`copy-create` attempt that held **after** its Content create and four draft saves
were acknowledged (for example a lost Composition derived-read continuation). It
never writes Content, Composition or Sitemap state and never replays the phase.
The validator accepts both the pilot attempt layout and the portable `run-phase`
layout, whose `execution.json` `bundleHash` binds `accepted-inputs.json`.

Run it from a **dedicated tool worktree** at the reviewed commit; the freeze binds
that worktree's recovery source bytes, so keep it unchanged until retained
verification finishes. The consumer checkout (`--checkout`) must be the original
attempt's clean checkout at the original head with the same installed Composer.

```sh
# 1. Offline: reconcile the held attempt, write committed-reconciliation.json beside it
#    (additive, never overwritten) and a proposed freeze. No server, no stage access.
node tests/native-authoring/static/run-phase08-recovery.mjs prepare \
  --original /absolute/987-static/phase-08 --out /absolute/phase08-freeze
# 2. Review every path in freeze.json, then run the read-only restart (guarded):
bash $HOME/.claude/scripts/heavy-guard.sh -- node tests/native-authoring/static/run-phase08-recovery.mjs run \
  --checkout /absolute/original-consumer-checkout --composer FULL_COMPOSER_SHA --stage notes-v1 --port 4198 \
  --original /absolute/987-static/phase-08 --freeze /absolute/phase08-freeze/freeze.json \
  --freeze-sha REVIEWED_SHA256 --artifacts /absolute/phase08-recovery
```

`prepare` refuses unless the original journal has one create, four paired 200
saves, no refused/uncertain write, a real `held`, the exact `begin` intent and a
capture delta of only that draft (`tokens.content` +5). `run` refuses a different
freeze hash, any frozen byte drift, a different consumer head, Composer, stage or
installed root, and a stage whose capture differs from the original after-capture.
A fresh browser opens the qualified entry; every non-read request aborts and holds.
It requires an exact paired `get-entry` loaded response equal to the reconciled
record and all four field values, then a byte-equal full capture after owned
shutdown. The runner self-checks with `verifyMetadataRecovery` before writing
`recovered-phase-proof.json`, and prints its `recoveryFreezeManifests` mapping.

#### Continuing phases 09–15 after a recovered phase08

`prepare.mjs` and `run-phase.mjs` accept a recovered phase08 proof only when the
config/intent carries its reviewed mapping, and they re-run the full validator
(every byte is frozen into the child bundle). Add the mapping to the config:

```json
{"marker":"static-w4b-987","activeProofPath":"/absolute/active-readonly/proof.json",
 "recoveryFreezeManifests":{"/absolute/phase08-recovery/recovered-phase-proof.json":"/absolute/phase08-freeze/freeze.json"}}
```

Append the recovered proof path as the eighth entry of the proof array and prepare
phase09 from the recovered `afterCapture` (digest unchanged from the held
attempt's after-capture). Then continue the ordinary loop for phases 09–15. The
portable `verify-static.mjs` requires fifteen `STATIC_PHASE_CAPTURE_VERIFIED`
proofs and therefore refuses this chain; verify the completed chain with the
retained runner below, merging the same `recoveryFreezeManifests` map into its
manifest. The original phase08 attempt remains FAIL.

The distinct phase09 publication recovery status
`COMMITTED_PUBLICATION_RECONCILED_AND_READONLY_PREVIEW_VERIFIED` uses the same
explicit `recoveryFreezeManifests` mapping. Its adapter is restricted to phase09,
requires the original successful activation receipt and exact release identity,
original failed title assertion, complete publication-only capture delta, and
unchanged recovery captures/installation. The frozen child bundle and actual
paired native `document-preview` response must bind the exact saved revision,
route, renderer, pack and Composition owner. The reviewed recovery driver verifies
the actual iframe `document.title`, description, noindex and Section heading before
its terminal read fence. A status string or invented preview response is insufficient.
Original phase09 remains failed; recovered preview acceptance and subsequent exact
build/production visitor acceptance are separate. Source fixture tests do not claim
that the pending installed recovery ran or passed.

### Final installation bridge without replaying the pilot

The original fifteen proofs and their captures remain immutable history. To verify
that retained state on a different installed revision, optionally add this descriptor
to the retained manifest and set `capturePath` to the **new public capture**:

```json
{"finalInstallationBridge":{"proofPath":"/absolute/final-installation-bridge.json","freezeManifestPath":"/absolute/final-installation-freeze.json","freezeManifestSha256":"REVIEWED_SHA256"}}
```

This is a final-installation witness, not a sixteenth authoring phase or a rewrite of
phase15. It requires all15 original phases to validate first. Without the descriptor,
the old exact-final-capture requirement remains unchanged.

Keep writers stopped. Preserve raw authored/history/release state before changing the
installation; do not initialize or migrate it. After the manager's frozen install and
source commit, obtain the new capture with the normal public `authoring:capture`
command. Review complete old/new captures: only `digest`, `componentPack.digest`,
`componentPack.compiler`, and `renderer.digest` may differ. Unknown fields, schema,
workspace, tokens, Content, Composition, Mapping, Sitemap, assets, public files and
all other identity fields must remain exactly equal. A bridge cannot authorize data
migration. Preserve the original store and stop if another field changes.

The manager can generate the witness without hand-assembling its fields. Run the
committed helper from the upgraded, clean, independently installed checkout, using
the **actual current immutable package SHA** (there is no built-in default pin):

```sh
PINSEL_AUTHORING_STAGE=notes-v1 corepack pnpm exec tsx \
  --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/static/prepare-final-installation.mjs \
  --composer FULL_CURRENT_IMMUTABLE_COMPOSER_SHA --stage notes-v1 \
  --chain /absolute/original-fifteen-proof-manifest.json \
  --before /absolute/manager-stopped-before-capture.json \
  --after /absolute/manager-stopped-after-capture.json \
  --artifacts /absolute/new-final-installation-evidence
```

The original chain manifest must still point to phase15's old final capture and
include its actual recovery-freeze mappings. The manager's stopped-before capture
must deeply equal that original final capture. The helper validates all15 original
proofs, resolves actual current public identities and installation provenance, and
writes only the exclusive external evidence directory. It never installs, captures,
starts a server, initializes a workspace or replays authoring/publication. It freezes
all original chain input hashes as well as both manager captures, the generated
bridge, identity/provenance files and manager-input record. It then reloads the
complete extended manifest and rechecks source, installation and frozen inputs.
Failure preserves any partial evidence directory; do not overwrite it.

Its output lists `retained-intent.json`, the freeze manifest and its SHA256. Obtain
independent review of these actual files before passing that intent to
`run-retained.mjs`. `FINAL_INSTALLATION_EVIDENCE_PREPARED_RUNTIME_NOT_RUN` means
only offline evidence validation; the runner must still prove fresh full capture
equality and current installed restart/build behavior. The helper deliberately
does not claim that caller-supplied captures are fresh or that raw history files
were preserved: the manager's stopped capture/preservation audit supplies that
separate evidence.

For review, the generated bridge JSON has **exactly** these fields:

```json
{
  "schemaVersion": 1,
  "kind": "static-final-installation-only",
  "beforeCapture": "/absolute/original-phase15/after.json",
  "afterCapture": "/absolute/current-public-capture.json",
  "beforeCaptureDigest": "ACTUAL_OLD_DIGEST",
  "afterCaptureDigest": "ACTUAL_NEW_DIGEST",
  "changes": [{"path":"digest","before":"ACTUAL_OLD_DIGEST","after":"ACTUAL_NEW_DIGEST"}],
  "pinselSha": "CURRENT_FULL_COMMITTED_SOURCE_SHA",
  "composerSha": "CURRENT_FULL_INSTALLED_PACKAGE_SHA",
  "stage": "notes-v1",
  "identitiesPath": "/absolute/current-public-identities.json",
  "provenancePath": "/absolute/current-installation-provenance.json"
}
```

The schematic `changes` array must enumerate **every actual difference** among the
four allowed fields, exactly once, with actual old/new values. `beforeCapture` must
be the final original proof's `afterCapture` path; `afterCapture` must equal the
retained manifest's new `capturePath`. Do not substitute reconstructed snapshots.

Generate identities through the exported
`resolveInstalledPublicIdentities(repoRoot)` in
`tests/native-authoring/static/final-installation-bridge.mjs`. It uses public
`loadHostContext`, `resolveAuthoringPackIdentity` and
`resolveAuthoringRendererIdentity`; save its exact `{packIdentity, renderer}` result.
Generate provenance as `{source, installed, composer, stage}`, where `source` is the
actual `sourceIdentity(repoRoot)` result from `header/provenance.mjs`, and `installed`
is the actual `assertInstalledPin(repoRoot, composer)` result from
`families/runtime-preflight.mjs`. These must describe the clean committed checkout
that will run acceptance, including all tracked source bytes, both active installed roots
and installed-lock identity. Do not substitute hashes from a sibling checkout.

Freeze the bridge, both captures, identity JSON and provenance JSON in an absolute
path-to-SHA256 manifest; every listed file is verified and every required dependency
must be listed. Independently review that manifest and put its exact SHA256 in the
retained descriptor above. The runner compares provenance and public identities
against the actual installation, freezes all input bytes for its child, rechecks
installation/source/input evidence around runtime and build, and preserves the
original phase statuses. A supplied identity JSON alone is not an installed attestation.

Use the same command below with the current full `--composer` pin. The output
`static-route-proof.json` separately includes `finalInstallationBridge`; success
still requires a fresh read-only restart, exact current-snapshot production build
and unchanged post-build public capture. Bridge validation alone is not runtime
acceptance, and does not establish full visitor interactions or deployment.

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
requires complete capture equality. `shutdown.json` records the owned detached
spawn PID/PGID, signal and wrapper exit, followed by bounded observations of port
release, host-root `.zudo-authoring.lock` absence and remaining live members of
that exact process group. Wrapper exit alone is insufficient. Zombie members do
not block settlement: the outer child reaper collects them after the runner exits.
A held port/lease or live process beyond the deadline refuses the after-capture;
there is no discovered-PID kill, forced kill or lease deletion. Preserve the failed
attempt and reconcile a separate stopped capture before a reviewed retry.
It then builds the exact snapshot if no build
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

## Extra Content record lifecycle (#988)

`tests/native-authoring/content-lifecycle/` proves one extra `page-copy` draft
through the real installed Content UI: create and save fields, a read-only
restart showing it present, deletion through the overflow menu **Delete entry…**
and its **Delete entry?** confirm dialog, and a read-only restart proving absence.
The installed controller deletes with one atomic `transact`
(`{expectedMutationToken, operations:[{kind:"delete-entry",id}]}`) on
`/__zudo_composer_content_provider`; the driver admits only that exact request at
the captured Content token, journals it before dispatch and records the original
200 response. Any other canonical request aborts and holds the step.

Each step is one guarded run with an owned server, a fresh browser profile and
full public captures before and after. The offline audit requires exact deltas:
create = only the new draft and `tokens.content` + (create + acknowledged saves);
present/absent restarts = byte-equal captures and a write-free journal (an exact
`get-entry` loaded response, or a complete `scan-entries`/`page-entries` listing
without the id); delete = only that entry removed and `tokens.content` + 1. All
other tokens, providers, Assets, public files and identities stay equal. Requests
settle before every navigation and reload. An uncertain outcome holds; there is no
replay or inverse. Run it on an accepted capture whose chain is complete (for the
static sequence, after phase15), because it advances the Content token.

```sh
echo '[]' > /absolute/lifecycle/proofs-0.json
# repeat for N = 1..4, appending each successful proof.json to the next array
corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/content-lifecycle/prepare.mjs lifecycle-988 \
  /absolute/accepted-capture.json /absolute/lifecycle/proofs-$((N-1)).json /absolute/lifecycle/intent-N.json
bash $HOME/.claude/scripts/heavy-guard.sh -- corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/content-lifecycle/run.mjs --composer FULL_COMPOSER_SHA --stage EXISTING_STAGE --port 4194 \
  --intent /absolute/lifecycle/intent-N.json --artifacts /absolute/lifecycle/step-N
```

The accepted capture for step N+1 is step N's `afterCapture`. Steps are `create`,
`inspect-present`, `delete`, `inspect-absent`; each writes
`CONTENT_LIFECYCLE_STEP_CAPTURE_VERIFIED` only after its audit. A held step keeps
`HELD.json`, its journal and both captures for explicit reconciliation.

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

Remaining static metadata and publication phases use bounded browser quiescence
plus exact Composition continuation settlement before navigation and close.
Metadata route editing requires Saved status before reload, checks the persisted
value afterward, and tracks pending write-admission waits through shutdown.
Publication returns only after its original release/reconciliation lanes and
Composition reads settle; the caller fences host-preview navigation and preserves
the publication-owned close/drain lifecycle. Settlement failures still close and
drain the browser, retain the first error, and never replay a request. These are
harness source guarantees, not evidence that remaining installed phases passed.

### Retain static acceptance across the closed Header href cycle

The ordinary final installation bridge still permits only `digest`,
`componentPack.digest`, `componentPack.compiler` and `renderer.digest`. A Header
edit followed by its inverse legitimately advances Content history metadata; do
not erase those advances or add them to the installation allowlist.

For this specific completed cycle, supply an optional typed supplement to the
evidence-only preparer. It accepts only the original failed forward's one
acknowledged href save, its completed `SAVED_HEADER_HREF_RECOVERY_VERIFIED`
recovery, one accepted inverse restoring `nav-about` to `/about/`, and a separate
`READ_ONLY_RESTART_VERIFIED` inverse restart. Original failure evidence stays
FAIL. Other edits, open cycles, schema changes and unknown field changes refuse.

Create an exclusive JSON outside the checkout:

```json
{
  "schemaVersion": 1,
  "kind": "closed-header-href-cycle",
  "priorInstallationBridge": {
    "proofPath": "/absolute/prior-aa8/bridge.json",
    "freezeManifestPath": "/absolute/prior-aa8/freeze.json",
    "freezeManifestSha256": "ACTUAL_PRIOR_FREEZE_SHA256"
  },
  "forwardRecoveryProofPath": "/absolute/header-recovery/recovery-proof.json",
  "inverseProofPath": "/absolute/header-inverse/proof.json",
  "inverseRestartProofPath": "/absolute/header-inverse-restart/proof.json"
}
```

Use the **original unbridged fifteen-phase manifest** as `--chain`. Keep the
original prior installation bridge, all original journals, accepted bundles,
provenance, captures, UI results and recovery/restart proofs available at their
recorded paths. The loader replays only evidence validation, never browser edits.
It reads their complete dependency closure, verifies original hashes, exactly one
successful inverse receipt and its qualified readback, the original failed
forward receipt/recovery, current preview identities and full captures. The closed
cycle must preserve every original field and value except digest, Content token
advancing exactly two, and the acknowledged owner's generation/update time.
All previous source/package identities remain historical evidence.

After the manager captures the stopped post-cycle state, performs the separately
approved installation, and captures its result, run the existing evidence-only
preparer with the additional argument:

```bash
node tests/native-authoring/static/prepare-final-installation.mjs \
  --composer "$EXPECTED_COMPOSER_SHA" --stage "$PINSEL_AUTHORING_STAGE" \
  --chain /absolute/original-fifteen-phase-manifest.json \
  --header-cycle /absolute/closed-header-cycle.json \
  --before /absolute/stopped-post-cycle-before-install.json \
  --after /absolute/stopped-after-install.json \
  --artifacts /absolute/new-final-installation-evidence
```

The supplied before capture must equal the completed inverse restart's entire
capture. The final installation step **still** uses the unchanged four-field-only
validator; a token, content, schema, asset, renderer-name or unknown field change
at this step refuses. The stage must stay the same. The producer seals all prior
and cycle inputs in the new freeze manifest, along with actual current installed
public pack/renderer identities and source/package provenance. The final loader
refuses any unsealed cycle dependency or changed repeated input read.

`CLOSED_HEADER_HREF_CYCLE_VERIFIED` qualifies the metadata advance separately from
`FINAL_INSTALLATION_IDENTITY_BRIDGE_VERIFIED`. Neither is a current runtime pass.
Only a later separately authorized `run-retained.mjs` on the new immutable
installation can establish current restart/exact-build acceptance. Do not rerun
the fifteen phases or either Header save to obtain that proof.
