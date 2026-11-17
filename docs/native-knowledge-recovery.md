# Recover an acknowledged Knowledge reference save

A terminal preview wait can fail after a Content save succeeded. Preserve that
failed run. Do not replay Save or run an inverse to obtain a successful test.
This recipe reads the existing saved reference and builds its exact capture. It
requires one original HTTP 200 response, public readback and a complete permitted
capture delta. A `{ok:true,result:null}` response is not a durable receipt ID.

The supported narrow case is a forward `knowledge-reference` run ending at
`after-knowledge-preview` with the 180-second `page.waitForLoadState` timeout.
Other errors, unresolved original Composition exchanges, multiple writes, changed
saved state or collateral edits refuse. Original failure remains `FAIL`; recovery
never fabricates a `PUBLIC_CAPTURE_VERIFIED` forward proof or authorizes Undo.

With the original consumer stopped and exclusive stage ownership, prepare a new
JSON evidence manifest outside the stage. All six values are absolute paths into
the preserved failed artifact directory:

```json
{
  "bundle": "/evidence/failed/accepted-inputs.json",
  "bundleHash": "/evidence/failed/accepted-input-sha256.json",
  "before": "/evidence/failed/before.json",
  "after": "/evidence/failed/after.json",
  "events": "/evidence/failed/events.ndjson",
  "provenance": "/evidence/failed/runtime-provenance.json"
}
```

Prepare a separate intent (substitute the real digest):

```json
{
  "kind": "knowledge-saved-reference",
  "capturePath": "/evidence/failed/after.json",
  "captureDigest": "<exact after capture digest>",
  "recoveryEvidencePath": "/evidence/recovery-input.json"
}
```

Use the repository's Node 24 and pnpm 11.5.2 environment, current clean reviewed
source, and independently installed immutable package. Run under the shared heavy
guard and existing child reaper, with the same original package and stage:

```sh
node tests/native-authoring/families/run-readonly.mjs \
  --composer "$COMPOSER_SHA" --stage "$STAGE" \
  --intent /evidence/recovery-intent.json \
  --artifacts /evidence/new-recovery-attempt --port 4199
```

The runner hashes/freezes all inputs, audits the original save and every original
Composition challenge/continuation, and requires a fresh whole capture equal to
the accepted saved state. Browser admission remains read-only. It checks the
Lessons card's independent title/description, qualified Note-derived href, actual
visitor click and target heading, and exact captured preview identity. A genuine
restart proof requires complete before/after capture equality and successful
original-response settlement through browser close.

The runner then uses public snapshot compilation/build, verifies route and asset
identities, the Lessons card and exact target Note `h1`, and captures again to
prove the build did not change authoring. An existing digest build is verified,
never overwritten; an incomplete existing build refuses. `proof.json` records
`READ_ONLY_RESTART_VERIFIED`; `recovery-proof.json` records
`SAVED_REFERENCE_RECOVERY_VERIFIED` and links the original failed save audit,
restart proof, exact build and rendered hashes. Retain both and the original run.
This is a recipe, not a recorded runtime pass.

## Terminal settlement rationale

Pre-navigation/reload barriers retain their existing bounded global networkidle
check. Only the final `after-knowledge-preview` boundary in this read-only recovery
uses `header/terminal-settlement.mjs`: all required UI assertions and exact target
preview identity have already passed, and no further navigation or write follows.
It first fences new read admission using the existing close classifier, then
requires zero tracked authoritative requests, zero derived challenges and zero
busy retry obligations, stable request epoch for 500 ms, checked lane drains, and
a 180-second overall settlement deadline. An exact previously observed busy-read retry (same endpoint/operation/body/client/epoch)
may finish once; concurrent duplicate retries are not admitted. Existing close fencing still refuses
unknown writes, aborts known new pure reads without dispatch, and settles already
admitted reads and exact challenged continuations. Late errors still fail.

Unrelated GET traffic is recorded with request start/finish/failure, frame-independent
path, resource type and elapsed time. It does not establish an unresolved canonical
read and does not become an asset pass. Pending traffic is included in failure and
terminal journals. The earlier timeout's cause remains unattributed; this change
claims neither a renderer defect nor a particular long-lived request. The helper
must never be called from a lane it drains. Other consumers may reuse it only with
the same explicit terminal UI/identity/read-obligation/close contract and review.
