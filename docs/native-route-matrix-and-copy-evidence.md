# Six-route preparation and copy/reference evidence

This supplements `native-route-owner-selection.md`. Preparation and artifact
checking are read-only with respect to native stores. They do not upgrade a
consumer, start a server, initialize a stage, or claim that a route passed.

## Prepare six frozen route inputs

After the manager verifies the stopped consumer's immutable package adoption and
new supported capture, use that exact capture file, package SHA and clean source
HEAD. Do not reuse a pre-upgrade capture without its explicit preservation audit.
The source HEAD must include the reviewed route selector fix. The new output
directory must not exist:

```sh
node tests/native-authoring/route-selection/matrix.mjs \
  /absolute/accepted-after-upgrade.json EXACT_PACKAGE_SHA EXACT_CONSUMER_HEAD \
  notes-v1 /absolute/new-route-matrix
```

The generator writes `matrix.json` and six intents: `home`, `about`, `voices`,
`notes`, `contact`, `not-found`. Each binds the same exact full capture. Expected
page source includes the active Sitemap provider/record, page ID and canonical
Composition provider/record from that capture. Pack, renderer and workspace
identity are retained too. A specific rendered node is selected only from the
actual preview; the node must be a canonical semantic descendant of the expected
page's main slot. The planner does not invent a node or treat Header/Footer as
page-specific selection.

When explicitly admitted, execute one intent at a time through the existing
`route-selection/run.mjs`, shared heavy guard and child reaper. Supply the matrix's
exact package/stage, a free port and a new artifact directory for each. Never
replay a failed artifact directory. Require every fresh `before.json` to equal
the matrix capture, and every stopped `after.json` to equal it in full, including
tokens. Source/package changes between routes require a newly prepared matrix;
do not silently combine different implementations into one six-route result.

After all six actual runs succeed, write an external JSON array of absolute
`proof.json` paths in matrix order (Home, About, Voices, Notes, Contact, 404):

```sh
node tests/native-authoring/route-selection/matrix-proof.mjs \
  /absolute/new-route-matrix/matrix.json /absolute/six-proof-paths.json \
  /absolute/new-route-matrix-evidence.json
```

The separate checker rereads frozen bundles, original preview and selection
events, provenance, screenshots and full captures. It checks exact owner ancestry,
preview/selection identity, distinct intermediate selection, terminal fencing,
matching source hashes, package/stage, and all six routes. Its output is
`ROUTE_MATRIX_ARTIFACTS_VERIFIED`, deliberately different from a browser result.
It hashes screenshots but does not inspect their pixels. It relies on separately
reviewed source for observed DOM assertions and finite read/write-denial gates;
it is not a second browser execution or independent operator review. Expected
terminal request-abort diagnostics are not automatically relabeled as failures;
actual held/error outcomes refuse. Asset rendering/build acceptance remains its
separate scenario.

## Detached copy is not implicit Content detachment

The historical Results phase10 duplicates the unbound
`files/results-year-year-2015` semantic Composition. Its original put challenge,
success response, fresh public reload and exact full capture delta establish:
new Composition ID, new root node ID, unchanged original Composition, unchanged
Content and unchanged Mapping. There was no live Content binding in that template
to copy. Do not describe this as preservation or detachment of an inherited live
Content reference.

Audit retained duplication evidence without opening any editor. Prepare a JSON
manifest containing exactly four absolute file paths: `before`, `after`, `proof`,
`events` (the original `events.ndjson`). Then:

```sh
node tests/native-authoring/families/copy-reference-proof.mjs \
  /absolute/duplicate-evidence-paths.json /absolute/new-copy-proof.json
```

This checks the original exact generated-output challenge/continuation and saved
acknowledgement, full loaded-record readback and unchanged source/all-other-domain
capture. It emits `DETACHED_COMPOSITION_COPY_VERIFIED`, explicitly leaving live
reference acceptance unestablished. It does not fabricate an original run proof.

## Smallest remaining live-reference behavior scenario

Wait until the existing Results family sequence supplies its complete graph and
native/build baseline. No new pattern/global-template feature is required.
`verifyLiveFamilyReferences(snapshot, family, 'results')` checks the existing
parent and TOC Mapping queries pin the **same** qualified `family.content.parent`
while referencing two distinct copied presentation Compositions. This is graph
proof, not behavior proof. Reuse the existing typed family driver for these four
separate, reviewed single-domain operations, retaining all original receipts,
public readbacks and full-delta audits:

1. Save a temporary distinct `result-year-label` on `family.content.parent` with
   a `content-field` intent. Never copy the label into Composition props. Native
   and exact static output must both show the new heading and TOC label/anchor.
   Derive the expected marker from this new captured label; retain the original
   descriptor for restoration. Verify the source template and original year-2015
   Content are unchanged.
2. Restore that Content field with a separately reviewed inverse. Repeat native
   and exact build checks; retain legitimate generation/history advances.
3. Change only the copied TOC Composition's `root[0].props.number` through a
   `record-edit` intent and the existing `番号` control. Full `auditDelta` must
   prove the original TOC template, parent presentation and all Content unchanged.
   Check the copied TOC output and unchanged shared label/heading.
4. Restore that local number through its own reviewed inverse and repeat output
   checks. No automatically combined inverse or partial mixed-domain proposal.

The full human Course-price proof already shows shared values affecting Home and
Lessons. It complements these new-copy checks but cannot stand in for propagation
through the newly authored Results family. Keep the four operations **NOT_RUN**
until their own installed receipts/restart/render/build evidence exists. The
existing family membership/order and three-state manifest remain separate gates.
