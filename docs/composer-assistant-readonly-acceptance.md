# Shared-field and unsupported-request acceptance

This bounded Pinsel fixture checks the human Inspector and the actual native
Assistant request/tool path using the installed immutable Composer package. It
is not a general model benchmark or a replacement for the seven-case
Apply/Undo/recovery matrix. The external predecessor passed at Pinsel `dea4587`
and Composer `4f1191d682995438380fccdb5bb692a299415402`; this repository-relative
promotion still needs its own integrated browser run. See the
[compatibility ledger](composer-compatibility.md) for dated evidence.

## Prerequisites and scope

Use Node 24 and pnpm 11.5.2 in a POSIX execution environment, frozen-install the
checkout, and install Playwright Chromium as described in
[native acceptance](native-authoring-acceptance.md#prepare-a-reproducible-checkout).
Follow its [fresh known-data bootstrap](native-authoring-acceptance.md#fresh-known-data-bootstrap-or-existing-saved-workspace)
or the appropriate explicit staged migration first. The runner never initializes,
reseeds, migrates or installs packages. It never operates on owner drafts or the
legacy D1 store. Keep all other editors stopped and freeze source during the run.

Use an explicitly named stage with the current model and known Pinsel semantics:
Lessons Consultation price, Home's reference to that price, and Contact's
consultation option label. Stable qualified Content IDs and semantic component
IDs are intentional fixture assertions; generated rendered-node IDs are resolved
from the actual public preview, not copied from a previous run. A different site
model requires a separately reviewed scenario, not relaxed assertions.

The runner forces the supported `fake` provider for its child authoring server.
It does not modify provider settings or credentials. Real authenticated inference
remains separate. A fresh run creates three durable conversations and one
unapplied Content proposal; no canonical Apply, Undo, field save, structural edit,
publication or inquiry submission is permitted. Preserve these Assistant records
and the complete stage/history after the run.

“Read-only” means canonical authoring state: Composition, Content, Mapping,
Sitemap, identities, tokens, managed Assets and captured public files must remain
fully equal. Normal Composition provider `get`/`list` calls can regenerate or
repair derived JSX. This is not zero filesystem writes and does not prove the
stronger challenge-bound derived-output protocol used by publication acceptance.
Original request bodies retain the generated output IDs and code; no auth headers
are logged. Evidence can contain known fixture content and should not be published
indiscriminately.

## Run the bounded proof

Run under the execution environment's shared heavy-test guard. The runner does
not hardcode a workstation profile, reaper location or nested guard. Choose an
unused loopback port and a **new external evidence directory whose parent exists**.
An existing evidence directory or occupied port refuses; the runner never attaches
to another editor. `NATIVE_ACCEPTANCE_CHROMIUM` may select an existing Chromium
executable using the same native-acceptance convention.

```sh
node --test tests/native-authoring/assistant-readonly/*.test.mjs

node tests/native-authoring/assistant-readonly/run.mjs \
  --composer '<exact installed 40-character Composer SHA>' \
  --stage notes-v1 \
  --port 4173 \
  --artifacts /absolute/existing-parent/new-readonly-proof
```

The command resolves this repository from its own location; there is no sibling
checkout or private Composer import. All four consumer manifests and installed
roots are checked. The explicit stage is used for both public captures and the
owned server. HTTP readiness requests HTML explicitly. Every preview must bind
the unchanged baseline capture digest.

The five assertions are:

1. Human Lessons price source is
   `content-filesystem/course/consultation/course-price`, with affected saved
   pages `/` and `/lessons`. Arrangement-owner uses remain `/lessons`.
2. Actual fake-provider pricing request calls `inspect_owner` and
   `propose_content`; its completed reply produces a `course/consultation`
   review card listing Home and Lessons, explaining separate domain reviews,
   and keeping Apply disabled until candidate acknowledgement. The runner never
   renders the candidate or applies it.
3. The supported deterministic `… on all pages` request explains separate
   reviews, calls no proposal tools, and produces no review card. This proves
   the fake-provider broader-scope refusal, not arbitrary mixed-language reasoning
   or a multi-domain transaction.
4. Human Contact option source is
   `content-filesystem/course/consultation/course-contact-option-label`, with
   `/contact` as its affected page, even though AI cannot edit that field.
5. That actual AI request calls only `inspect_owner`, explicitly reports the
   host-policy refusal, and produces no review card.

The original browser fetch response remains the application's transport. An
immediate `Response.clone()` observes streamed NDJSON without reissuing a request
or relying on Chromium's response-body cache. Page/frame, workspace, HTTP success
and Content-Type are checked. Observer or request-policy failures latch a failed
result and prevent further conversation creation/model starts. Canonical mutation
operations are denied, including Apply and Undo.

## Preserve failure and recover event evidence

Never rerun into an existing evidence directory or repeat an uncertain mutation.
A failed run still closes its owned browser/server, verifies the port is free,
and attempts an offline public after-capture. Read `result.json` and preserve all
logs, captures, profiles and Assistant records. A cleanup failure or missing
capture is a hold, not a pass. No reset, inverse or deletion is attempted.

If the pricing proposal was created but the original run's event observation was
lost, recover its **existing** identity from the prior evidence:

```sh
node tests/native-authoring/assistant-readonly/run.mjs \
  --composer '<same exact installed Composer SHA>' \
  --stage notes-v1 \
  --port 4173 \
  --artifacts /absolute/existing-parent/new-recovery-proof \
  --recover-price-from /absolute/existing-parent/prior-readonly-proof
```

Point recovery at the original fresh pricing attempt, not a later recovery attempt
whose first newly started run may be a refusal. Recovery checks the same checkout, stage and package and deep-compares the current
public capture with the prior `before.json`. It requires a positively identified
prior price `start` response, selects that conversation through the supported UI,
and verifies the exact original prompt, revision and owner. It reads the public
`events` endpoint for that exact existing run with `afterSeq: 0`. Only transient
headers observed on the current application's own Assistant read are reused;
credentials are never invented or logged. Historical price tool evidence is
identified separately from the two newly run refusal checks. This creates no
second price proposal and never retries Apply.

If the prior start response is missing or ambiguous, recovery refuses. Reconcile
through the supported Assistant conversation/run readback and retain the evidence;
do not switch to fresh mode to guess whether another proposal is needed. Recovery
here is for stream evidence, not lost canonical Apply receipts. The main Assistant
matrix remains responsible for receipt recovery and guarded Undo.

## Evidence and completion

`manifest.json` records the source commit and acceptance-module hashes, immutable package installation, workspace/pack/renderer,
stage, port and any recovered identity. `events.jsonl` retains original request
bodies, public responses, completed run events and actual tool names. Five PNGs
show human sources, price review and refusal reasons. `before.json` and `after.json`
are public coherent captures; `result.json` records the five-case result and full
capture equality. A PASS requires all assertions and shutdown/capture verification.

Keep the source branch, stage, history, proposals and artifacts until the manager
reconciles them. Report the exact source/package/capture identities, guard result,
retained resources and any failure. No deployment, live-provider inference,
owner-data cutover or full CMS completion is implied by this bounded proof.
