# Results and FAQ family acceptance tooling

The repo-relative tooling in `tests/native-authoring/families/` prepares and checks
Results-year and FAQ-group authoring through the installed Composer UI. It is an
acceptance harness, not another authoring implementation. **The complete installed
family scenario is NOT_RUN.** Pure tests and source review do not establish an
installed package pass. See the compatibility ledger for actual evidence.

After creation/configuration, follow the [owned rendering, three-state membership,
static visitor and two-child order recipe](native-family-followup-acceptance.md).
The original 88-phase completion flag does not establish those follow-up results.

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
node tests/native-authoring/families/sequence.mjs \
  /absolute/config.json /absolute/accepted-capture.json \
  /absolute/proof-paths.json /absolute/active-identity.json /absolute/intent.json
```

Inspect `sequence.step`, the qualified owners, exact document and action. After
review and an exclusive writer window, run this command **inside the shared heavy
guard** used by your environment:

```sh
corepack pnpm exec node tests/native-authoring/families/run-phase.mjs \
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

Use the standalone read-only restart runner below. It calls `verifyFamilyRendering`
to select Browse page, inspect the actual host iframe section and TOC, check the
resulting iframe hash, and check FAQ `details.open`. Runtime acceptance remains
NOT_RUN until this runner succeeds at the recorded installed revision.

Build only an accepted capture using the existing public build recipe:

```sh
PINSEL_AUTHORING_STAGE=EXISTING_STAGE corepack pnpm --filter @pinsel/content authoring:build -- /absolute/accepted-capture.json
PINSEL_AUTHORING_STAGE=EXISTING_STAGE corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json \
  tests/native-authoring/families/verify-build.mjs \
  /absolute/accepted-capture.json /absolute/family.json faq /absolute/exact-build-output
```

Build commands are heavy and use the same shared guard. Existing digest-named output
is refused, never overwritten. Verification checks all captured routes, all compiled
asset bytes, the exact pack/renderer identity, qualified Mapping bindings/transforms,
query order, actual parent and TOC placement, and DOM containment. Mere text elsewhere
in the HTML cannot satisfy the family section assertion.

For live membership, generate one exact Content reference edit:

```sh
node tests/native-authoring/families/membership.mjs \
  /absolute/accepted.json /absolute/family.json faq move /absolute/move-intent.json
# Review/run that one phase through run-phase, then:
node tests/native-authoring/families/verify-membership.mjs \
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
pnpm exec vitest run --config tests/native-authoring/families/vitest.config.ts
```

Runtime selectors, full sequence, publication, restart, visitor interactions and
exact build outputs still require installed acceptance and separate evidence at the
exact package and Pinsel revisions. Actual owner-data cutover and new authenticated
model-provider acceptance remain held independently.

A lightweight installed identity-shape check (no capture, build or native-store operation) is available through `corepack pnpm exec tsx --tsconfig packages/pinsel-content/tsconfig.scripts.json tests/native-authoring/families/installed-identity-readcheck.mjs`. The public host identity omits `manifestDigest`; public snapshot compilation independently verifies that captured manifest digest.

## Standalone read-only restart and active-release handoff

These commands require the same clean committed consumer checkout, frozen install,
existing stage and stopped writers as mutation phases. Run through the shared heavy
guard and environment child-reaper. Do not run against owner drafts. Every intent
and artifact path must be new; artifact directories must be outside the checkout.
The runner starts its own server and fresh browser profile, fences source bytes,
compares a fresh full public capture to the accepted input, then stops its server
and requires unchanged public capture. The parent captures the intent, accepted
capture and optional Header proof into `accepted-inputs.json`; the child verifies
its parent-supplied hash and consumes those exact objects. Original input hashes
are rechecked before browser work and before proof creation, so changing a marker,
mode or proof while startup is pending holds the attempt. It never initializes a stage or performs a
canonical mutation. Ordinary reads can perform only server-challenged derived JSX
repair through the existing Composition observer. Every admitted POST is observed
through its original response and durably journaled; unsupported operations latch a
hold. It drains observations before/after browser closure and never retries writes.

Read admission follows the installed provider wire contract: Content, Mapping and
Sitemapper send the selected workspace header; the host Assets root and workspace
registry send capability headers without that workspace header. The observer does
not manufacture headers. It checks registry open/selection responses against the
accepted workspace, uses endpoint-specific read allowlists (including the actual
`__zudo_composer_sitemapper_provider` endpoint), and still refuses all canonical
mutation operations. Same-origin original-response checks and exact public captures
remain required. This fixes the observer contract, not an installed runtime pass.

First save a fresh public capture with the editor stopped. For release identity,
write this intent, substituting the actual capture path and its digest:

```json
{"kind":"active-identity","capturePath":"/absolute/accepted.json","captureDigest":"ACTUAL_SHA256"}
```

Run the same command for either intent kind:

```sh
corepack pnpm exec node tests/native-authoring/families/run-readonly.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage EXISTING_STAGE \
  --intent /absolute/readonly-intent.json --artifacts /absolute/new-readonly-attempt --port 4198
```

The browser opens Review & release and clicks only **Inspect current state**.
Successful public `list` and exact active `get` responses must agree on the selected
project and revision; an absent active release or a different staged head refuses.
Only after browser settlement and unchanged offline capture does the runner write
`proof.json` (`READ_ONLY_RESTART_VERIFIED`) and `active-identity.json`. Pass that exact
identity file to `sequence.mjs`; retain the proof and original response journal.
It proves public active identity, not a Pinsel production-rendered release artifact.
Do not run publication to manufacture this prerequisite without separate review.

For rendering, use the actual completed family descriptor to supply marker,
childText and kind. For the created/restored state use:

```json
{"kind":"family-render","capturePath":"/absolute/accepted.json","captureDigest":"ACTUAL_SHA256","family":"faq","marker":"ACTUAL_MARKER","childText":"ACTUAL_CHILD_TEXT","present":true}
```

For moved membership set `present:false` and add `oldFragment` from the accepted
family descriptor. Results uses `family:"results"`. Review these values against the
saved descriptor before execution. Each run starts a new server/browser, checks
section containment and TOC navigation; FAQ present-state checks its disclosure.
Successful output includes `verified.png`, requests/responses, source provenance,
before/after captures and the proof. Follow with the exact accepted-snapshot build
and `verify-build.mjs` recipe above: browser proof alone does not establish static
output or captured asset fidelity. Membership inverse gets its own fresh intent,
artifact directory, restart proof and exact build; it does not delete family records
or release history. Preserve failures and reconcile public readback before advancing.

## Fresh-stage first local baseline prerequisite

The family sequence requires an already active local baseline. A fresh explicit
known-data initialization does not create one. Do not invent an active identity or
publish unrelated drafts to satisfy this prerequisite. The separate first-baseline
runner implements the initial local activation described in
[native route acceptance](native-route-acceptance.md), selecting **only** the
published qualified identities in the reviewed public capture. It refuses any
existing active release or staged project head. It creates no Content, pages or
families, and it neither deploys nor claims production-rendered release output.
The first local baseline run passed in 123s at Pinsel 9497 / Composer 5fe6, followed
by an independent active-release restart pass in 63s at f54 / the same package.
These prove local activation and exact public active-identity readback; they do
not prove the complete Results/FAQ families or production-rendered release output.
See the [compatibility ledger](composer-compatibility.md) for the exact identities,
retained failures and remaining runtime acceptance.

With a clean committed frozen-install checkout, explicit known-data stage, stopped
writers and a fresh public capture, prepare an exclusive intent:

```sh
node tests/native-authoring/families/prepare-first-baseline.mjs \
  /absolute/accepted-capture.json /absolute/new-baseline-intent.json
```

Review its complete published identity list, capture digest and explicit
`expectedActive: null`. Inside the environment's shared heavy guard and child reaper:

```sh
corepack pnpm exec node tests/native-authoring/families/run-first-baseline.mjs \
  --composer FULL_IMMUTABLE_COMPOSER_SHA --stage EXISTING_STAGE --port 4198 \
  --intent /absolute/new-baseline-intent.json --artifacts /absolute/new-baseline-attempt
```

The actual Review & release UI inspects the empty catalog, selects those exact
published records, checks/approves/stages/builds the reviewed candidate and activates
it locally. Original requests and responses are journaled; unsupported mutations,
changed source/inputs, uncertain responses, nonempty catalog and unexpected deltas
hold the run. Reconciliation must match the actual activation challenge and exact
qualified publication list. Public active catalog and candidate readback must agree.
No retry, reset, inverse, initialization or automatic cleanup is provided.

Activation advances the native global Content token once for its reconciliation
fence even when every selected entry was already published. The actual public
reconciliation response must prove that token; the full offline capture comparison
requires every original field, entry generation, lifecycle, model, Composition,
Mapping, Sitemap, asset and other domain token to stay exact. Release history and
the first baseline are retained. Success writes `FIRST_BASELINE_ACTIVATED_VERIFIED`
and `active-identity.json`; failure retains all artifacts and requires public
reconciliation before further writes. Do not replay an uncertain activation.

Use the successful after capture and the standalone `active-identity` read-only
restart recipe above to confirm its active identity before starting the family
sequence. The first local release is a prerequisite, not a family-runtime or
Pinsel exact-production-build pass. Family mutations remain separately reviewed.

### Read-only shutdown boundary

The read-only runner classifies late POST requests before applying its close fence.
Known new reads are aborted and journaled as `read-aborted-at-close`; they are not
forwarded or counted as readback. Unknown operations, canonical mutations and
foreign scopes still fail the run. Already admitted responses must settle, and
Composition output continuations still require the existing exact outstanding
challenge gate. A failed close attempt remains failed even when its public capture
is unchanged; the next run is read-only inspection, never another activation.

A coordinated provider read marked by the installed client as
`x-zudo-authoring-read: 1` may return an original `409 authoring-busy` response.
The runner retains that refusal and lets the installed client perform its bounded
retry; it never sends a replacement request or fabricates success. The same
operation, input, client and epoch must later yield an original successful response
before completion. Unmarked, unsupported, unresolved or other errors still fail.

### Mutating phase inputs and structural reloads

The family and Header mutating runners capture external intent and complete public
snapshot once, then pass an exclusive accepted-input bundle plus its independent
SHA256 to the browser child. Original files, bundle and committed source are checked
before browser work and before accepting the result. Child execution never rereads
an external intent as authority. Same-digest edits to values or snapshot fields
therefore refuse; they cannot change the action after parent admission.

Component-root actions target the first canonical component child of the virtual
Document row and verify its exact saved node ID in the inspector before changing a
field. Virtual Document is never treated as the component. Pin selection waits up
to the existing180-second UI budget for one exact record-ID row.

Structural completion requires the selected owner URL, Saved state and record name,
then an actual document reload followed by the browser's own qualified public get
of the complete acknowledged Composition/Mapping record. Attachment phases require
the selected Mapping plus the complete updated workspace metadata and token from
public open. Challenged Composition output alone is not a loaded-record proof.
Bounded browser quiescence and derived-read settlement bracket reload; an empty
request queue alone does not establish readiness. These checks do not replace the
outer stopped-server full capture, domain delta or later independent restart run.

## Before each canonical write

Family UI gestures now wait for browser quiescence and the bounded Composition
read protocol before Save, Create, Duplicate, attachment, binding and field actions.
Choosing a Mapping's Composition can start a `get`/derived-output challenge; an
empty pending request set alone is not readiness. Original write requests also
wait **outside** the serial write gate, so the matching read continuation can
complete. The existing 180-second read budget, exact owner/one-write validators,
original-response transport and no-replay behavior remain unchanged.

Composition's own nonempty generated-output continuation bypasses that prewrite
wait only when its write gate reports an outstanding write challenge; the same
exact gate still validates the record and challenged output closure before sending
it. This avoids waiting on the continuation's own obligation. Pending admissions
remain tracked through close, and failure/closing refuses an unstarted write.
A refused attempt stays failed; inspect its complete stopped capture and generate
fresh reviewed inputs before any separately authorized next attempt.
