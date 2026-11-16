# Native Note routes and explicit page ownership

The native pack0.4.0/native-v3 contract adds dynamic Note detail routes. It retains
all old Content fields, IDs, lifecycle, metadata and independent Knowledge-card
excerpts. Existing internal Note Compositions and Mappings remain recovery material;
only Sitemap routes identify user-facing pages. `buildPinselSite` remains the
historical seed-structure builder used by the immutable migration gates. Explicit
native initialization normalizes its known input; startup never regenerates state.

## Existing workspace migration

Stop the source editor. Capture its current course-identity-v1 workspace with its
matching pack0.3.0/native-v2 checkout and installed dependencies:

```sh
PINSEL_AUTHORING_STAGE=course-identity-v1 pnpm --filter @pinsel/content authoring:capture -- /absolute/source.json
```

Review the returned digest and retain the source checkout, store, public files and
history. In the installed T6 checkout, run the separate migration without a stage
environment override:

```sh
pnpm --filter @pinsel/content authoring:migrate-notes -- /absolute/source.json <reviewed-digest> --source-root /absolute/old-checkout/packages/pinsel-content
```

`--source-root` points to the actual stopped source host, not a private-file copy.
The public source-currentness check verifies its native domains and public files
before and after staging. The target is the new checkout's `.native-authoring-notes-v1`
and `.native-public-notes-v1`. Existing destinations are refused. Initialization is
staged across stores, not a transaction: preserve any partial destination for review,
never clean/reseed it to hide a failure. Nonempty managed Assets currently require a
separate supported importer and are refused before creating destinations.

The migration accepts only the reviewed old Note topology and source identities.
The two exact canonical graph fingerprints represent captured legacy explicit pins
with the known impossible fallback condition and current public DSL pins without
that condition. Their graph contains complete Composition/Mapping documents and
relative attachment order, with only the five known Note identity prefixes
normalized. Custom layout, TOC properties, bindings, selection, attachments, route
titles/notes and navigation to retired fixed nodes require explicit separate review;
they are not silently overwritten. The supplied reviewed digest alone does not
waive these checks. All new node/record IDs are checked for collisions.

The candidate adds two Compositions, two Mappings and five attachments, changes the
Knowledge link binding and replaces five fixed Sitemap detail children with one
entry-field child. The exact JSON-pointer changes are recorded in
`.native-note-routes-evidence.json`. Actual imported Content is compared to source;
only the initializer's positive entry-generation reset to1 is allowed and recorded.
`.native-note-routes-snapshot.json` is the coherent reviewed build input.

After reviewing successful evidence, explicitly select the new known-data stage:

```sh
PINSEL_AUTHORING_STAGE=notes-v1 pnpm dev
# Save, stop, capture, and build using this same selection:
PINSEL_AUTHORING_STAGE=notes-v1 pnpm --filter @pinsel/content authoring:capture -- /absolute/reviewed-notes.json
PINSEL_AUTHORING_STAGE=notes-v1 pnpm --filter @pinsel/content authoring:build -- /absolute/reviewed-notes.json
```

An old workspace opened with the new pack fails compatibility preflight. It is not
reset. Restore its matching old checkout/runtime to resume its authority. Never run
both stages as active writers during a real cutover. This recipe is a known-data
rehearsal; owner D1 data import, owner-editor switch, model inference and deployment
remain separately held. The compatibility ledger records actual executed results.

## Content and placement contracts

Note identity is its qualified Content ID, not its slug. Sitemap entry-field routes
use `note-slug` and `note-title`; document metadata resolves the compiled selected
entry in the captured project. The list and related list retain their Note-owned
copy. Knowledge cards retain their separate title/description and use the existing
Mapping `route-link` projection for their qualified Note reference. Missing,
unpublished or ambiguously routed referenced Notes block output; no guessed URL
or fallback copy is substituted. New Note UUIDs need not equal slugs.

The new semantic Note TOC owns arrangement and its accessible association. Its
single label slot contains a site-copy-owned label span; its items belong to the
selected Note body. The parent renders `aria-labelledby` to its own stable ID,
derived from read-only rendered-node identity, and keeps the original classes,
icon, span and ordered list. The label's own selection target is preserved. An empty optional label slot renders the structural fallback “Contents”; it does
not copy or mutate shared Content. Add a label child for custom text. An empty label
text also uses this local structural fallback; a nonempty mapped site-copy label
remains authoritative. Single-slot validation rejects extra label children.
The original scalar-label Toc contract remains unchanged for historical content.

Model descriptions mentioning five Notes, three Courses or eighteen FAQs describe
the seed baseline, not a native collection limit. This migration deliberately does
not rewrite those model metadata records. New published Notes expand the route set;
new published Courses appear on Home and Contact by their collection queries.
Lessons membership stays explicitly pinned. A Note slug rename changes its route;
there is no automatic redirect promise. Existing URLs must be reviewed and preserved
or deliberately migrated with their links. A draft Note does not produce a release
route; publication must use the supported Review & release workflow, not raw files.

## Creating a static page

Create or clone an independent Composition, save it, add a Sitemap node and assign
that source. Sitemap Add initially has an unassigned source. Sitemap Duplicate keeps
its source reference; it does not detach the Composition or its shared mappings.

Create exactly one published `page-copy` entry whose route matches the normalized
new path, with explicit title and description. Missing/duplicate metadata fails the
host preview/static render; the deliberate404 empty-description exception remains.
A new page may use local semantic components without copying an existing page's
route-filtered Content mappings. Shared values stay with their original owners.

Header/footer navigation remains deliberately Content-owned and differently ordered.
A new page is unlisted until the author explicitly changes navigation Content.
Moving/renaming a page requires separately reviewed metadata/link updates; there is
no implicit cross-domain atomic rename. Validate the complete saved graph before
release. New Results-year/FAQ-group placements and singleton-like collection duplicate
behavior remain separate scenarios, not implied by successful Note/page fixtures.

## Executable checks and remaining acceptance

`note-routes.test.ts` exercises migration refusal, preservation, dynamic route links,
ID!=slug and draft-reference refusal. UI `native-routes.test.ts` uses public compilation
and the real ZFB renderer for all14 old routes, precise historical body parity (only
the two reviewed Note TOC accessibility attributes differ), a fifteenth Note, a new
static page with explicit metadata and a UUID Course. These are deterministic fixture
checks, not a claim that native publication/UI creation passed. Follow
[native installed acceptance](native-authoring-acceptance.md) for browser save,
publication reconciliation, restart/recovery and exact captured build evidence.
