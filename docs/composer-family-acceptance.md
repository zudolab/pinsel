# Results and FAQ family acceptance tooling

The repo-relative tooling in `scripts/verify/composer-families/` prepares and checks
Results-year and FAQ-group authoring through the installed Composer UI. It is an
acceptance harness, not another authoring implementation. **The complete installed
family scenario is NOT_RUN.** Pure tests and source review do not establish an
installed package pass. See the compatibility ledger for actual evidence.

## Boundaries and inputs

Use Node 24 and the repository's pnpm 11.5.2 through Corepack. Install the frozen
lockfile in this checkout. Never link a sibling Composer checkout. The scripts
resolve their repository from `import.meta.url` and load only public installed
Composer exports. They require an explicit immutable Composer SHA, existing named
stage, loopback port and exclusive artifact directory. They never initialize,
migrate or reseed a stage, deploy, mutate D1, deliver inquiries, or invoke a model.
Keep every other writer stopped for the selected stage and serialize heavy work
through your environment's shared heavy guard.

The caller supplies these **reviewed inputs**, not private storage files:

- A fresh coherent public `authoring:capture` from the intended existing stage.
- A config JSON with `kind` (`results` or `faq`), a unique lowercase `marker`,
  `parentTitle`, `childText`, and `answer`.
- An ordered JSON array of successful phase `proof.json` paths, initially `[]`.
- The exact active identity `{projectId, revision, buildId}` obtained from accepted
  public release readback. A workspace capture does not establish active release.

Example config (these are authored labels, never fabricated record IDs):

```json
{"kind":"faq","marker":"acceptance-faq-unique","parentTitle":"Acceptance FAQ","childText":"Acceptance question?","answer":"Acceptance answer."}
```

`fixture.json` is a reduced synthetic unit-test project derived from known baseline
model/template shapes. Its digest is deliberately invalid for a real capture. It
has no prepared Assets, user draft database or runtime authority. Never initialize
or run a writer from it.

## Generate and run one phase

Paths below stand for caller-owned files; use a new intent and artifact destination
for each phase. The generator writes exclusively and cannot dispatch mutations.

```sh
node scripts/verify/composer-families/sequence.mjs \
  /absolute/config.json /absolute/accepted-capture.json \
  /absolute/proof-paths.json /absolute/active-identity.json /absolute/intent.json
```

Inspect `sequence.step`, the qualified owners, exact document and action. After
review and an exclusive writer window, run this command **inside the shared heavy
guard** used by your environment:

```sh
corepack pnpm exec node scripts/verify/composer-families/run-phase.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage EXISTING_STAGE \
  --intent /absolute/intent.json --artifacts /absolute/new-phase-artifacts --port 4198
```

No default package, stage, port or artifact location is guessed. Before server/browser work, `runtime-provenance.json` records Git HEAD/status, harness
source hashes, intent/baseline file hashes, selected pin/stage/port, and resolved
installation evidence without environment values. The runner verifies
all four installed consumer pins, compares a new public capture to the entire
reviewed capture, starts its own loopback server, performs one phase, stops that
server, captures again, and audits the exact allowed delta. It preserves failures
and never performs an automatic inverse, delete, publication retry or cleanup.
Use only the successful proof's `afterCapture` for the next invocation and append
its path to a new history file. Never insert a failed attempt or rewrite history.
Unexpected writes, stale captures and unresolved responses stop progression.

The sequence creates parent and child Content, fills typed fields, publishes only
that exact pair while retaining the active baseline and excluding unrelated drafts,
duplicates three semantic templates, creates fresh Mappings/bindings, configures
qualified-reference filters and ordered pins, and attaches parent/child/TOC
presentations through explicit Groups. Record and node IDs come only from accepted
create/duplicate responses. The sequence rejects missing, reordered or differently
configured proof history. Its final output is `complete:true` with the actual
family descriptor; save it as the family JSON for verification.

Reference `exists → equals` uses operator selection and the exact qualified picker
before Save. Only the complete typed tuple is authorized to persist. If this UI
emits an intermediate write, the phase refuses; do not broaden its expected record
or invent a timing-based pass. `equals → not-equals → equals` are separately checked.

## Exact rendering, builds and live membership

The exported `verifyFamilyRendering` helper must run in a separately reviewed
browser phase with a canonical-write-blocking observer and exact public before/after
captures. It selects Browse page, checks the actual host iframe section and TOC,
checks the resulting iframe hash, and checks FAQ `details.open`. It is **not** a
standalone browser command or permission to attach to an active owner session.

Build only an accepted capture using the existing public build recipe:

```sh
PINSEL_AUTHORING_STAGE=EXISTING_STAGE corepack pnpm --filter @pinsel/content authoring:build -- /absolute/accepted-capture.json
PINSEL_AUTHORING_STAGE=EXISTING_STAGE corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  scripts/verify/composer-families/verify-build.mjs \
  /absolute/accepted-capture.json /absolute/family.json faq /absolute/exact-build-output
```

Build commands are heavy and use the same shared guard. Existing digest-named output
is refused, never overwritten. Verification checks all captured routes, all compiled
asset bytes, the exact pack/renderer identity, qualified Mapping bindings/transforms,
query order, actual parent and TOC placement, and DOM containment. Mere text elsewhere
in the HTML cannot satisfy the family section assertion.

For live membership, generate one exact Content reference edit:

```sh
node scripts/verify/composer-families/membership.mjs \
  /absolute/accepted.json /absolute/family.json faq move /absolute/move-intent.json
# Review/run that one phase through run-phase, then:
node scripts/verify/composer-families/verify-membership.mjs \
  /absolute/accepted.json /absolute/moved.json /absolute/family.json faq move
```

The comparison permits only the qualified child's reference, ordinary save timestamp
and exact Content generation/token transition. All other Content, Composition,
Mapping, Sitemap, attachments, Assets and tokens stay exact. Verify the child is
absent from the new section and present in `family.oldFragment` through actual native
rendering and an exact moved-state build. For moved-state build verification append
the before-capture path to `verify-build.mjs`. Generate an inverse with `inverse`
instead of `move`, then verify that separate exact transition. Use ordinary build
verification on the restored capture. No automatic restore is provided.

## Protocol and recovery contract

These modules are Pinsel-authored test observers and assertions over the browser's
actual protocol. They do not copy Composer's storage, compiler or release engines,
and never regenerate JSX themselves. Requests continue through their original
browser transport; no `route.fetch` replay or invented security headers are used.

Composition uses its JSON operation envelope. One logical ordinary put may first
return `needs-output` without a canonical commit. Only the exact challenged source
closure/output IDs and same record can continue; a final canonical `saved` receipt
is required. This put is not record CAS. Startup list/get may repair derived JSX;
canonical-read-only does not mean filesystem-write-free. Other-domain writes refuse
a failed or unresolved derived-output lane.

Release requests are queued behind prior durable catalog evidence, with at most one
pending canonical operation. Reconciliation is a separate lane to avoid activation
deadlock. Before each next release click, response journals drain. All lanes drain
before completion. Requests and responses are fsynced into append-only events;
headers and credentials are not logged. The browser can receive a response before
its journal finishes; the helper returns only after settlement. Lost responses are
held for supported public reconciliation, never blindly retried. Ordinary startup
must not reset state to make a test pass.

## Portable promotion strategy

The minimal reusable layer is `original-request`, `composition-read`,
`composition-output`, `composition-authoring`, and `release-queue`, with their focused
protocol tests. Static-page and Header fixtures should adopt this layer only after
their active pilot is complete, then move to repo-relative configuration and their
own exact owner/delta tests. Do not import an active external pilot or copy a private
Composer storage implementation. Their runtime and publication acceptance remain
separate from family acceptance. A later coordinated extraction into a neutrally
named test-support directory can remove duplication without changing wire admission.

Scenario code stays separate: family sequence/graph/membership assertions here;
Sitemap hierarchy/navigation and Header placement assertions in their own modules.
Shared runner configuration should require the same explicit pin/stage/port/artifact
contract. Public capture and active receipts must remain different inputs. Never
replace their guards with file-by-file private storage reconstruction.

Unit validation (no browser, native writer or server):

```sh
pnpm exec vitest run --config scripts/verify/composer-families/vitest.config.ts
```

Runtime selectors, full sequence, publication, restart, visitor interactions and
exact build outputs still require installed acceptance and separate evidence at the
exact package and Pinsel revisions. Actual owner-data cutover and new authenticated
model-provider acceptance remain held independently.

A lightweight installed identity-shape check (no capture, build or native-store operation) is available through `corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json scripts/verify/composer-families/installed-identity-readcheck.mjs`. The public host identity omits `manifestDigest`; public snapshot compilation independently verifies that captured manifest digest.
