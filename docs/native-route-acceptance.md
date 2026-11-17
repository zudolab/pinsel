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
