# Family follow-up acceptance

The existing Results 45 / FAQ 43 operation histories and `sequence.mjs` are unchanged.
Their `complete:true` means **creation/configuration complete**, not complete T6/T7
acceptance. Keep every original failure and accepted transaction. Do not recreate a
family, repeat a successful write, or reinitialize the workspace to use this recipe.
This source adds verification; no new runtime pass is recorded here.

## Owned rendered values and three membership states

Use the exact accepted final descriptor and public capture. Native `run-readonly.mjs`
now resolves the qualified child and parent in that capture and checks the real
parent heading, FAQ answer after disclosure, or Results school and department in
one exact row. A moved child is checked in its actual destination while its original
parent's heading remains checked. Results' declared count is independently authored;
it is not silently recalculated from membership. No expectation comes from a copied
Composition property. Ambiguous child text or parent mapping fails closed.

For each family collect **created**, **moved**, **restored** states. Use the existing
`membership.mjs` and `run-phase.mjs` recipes for the one qualified reference edit and
its guarded inverse, with exact before-image request admission, original-response
gating, public readback, stopped
capture and `assertMembershipDelta`. The inverse advances history/token; its digest
need not equal created. Full unrelated domains and assets must remain identical.
Content `put-entry` here does not carry a server CAS precondition. Exclusive writer
ownership, original-response gating and whole-capture audits must not be described
as an atomic server compare-and-swap guarantee.
At each state run the existing read-only restart recipe with that capture and the
correct `present`/`oldFragment`. Keep `proof.json`, `before.json`, `after.json` and
screenshots; do not use `ui-result.json` alone as restart proof.

Build each reviewed capture with the public build command into a new output; never
reuse another state's artifact. Then run both checks (absolute paths shown as shell
variables which the operator must set from actual accepted evidence):

```sh
node tests/native-authoring/families/verify-build.mjs "$CAPTURE" "$FAMILY" "$KIND" "$OUTPUT"
# For moved, append the actual created capture and original destination fragment.
node tests/native-authoring/families/verify-build.mjs "$MOVED_CAPTURE" "$FAMILY" "$KIND" "$MOVED_OUTPUT" "$CREATED_CAPTURE" "$OLD_FRAGMENT"
bash "$HEAVY_GUARD" -- \
  node tests/native-authoring/families/static-visitor.mjs "$CAPTURE" "$FAMILY" "$KIND" "$OUTPUT" "$NEW_ARTIFACT_DIR" "$STATE"
```

`STATE` is `created`, `moved` or `restored`. `HEAVY_GUARD` is your execution
environment's shared heavy-test guard script (historical runs used a workstation
path; no path is assumed here). Static visitor starts its own loopback
server on an ephemeral port, serving only the captured built directory. It opens
actual emitted HTML with scripts/CSS, clicks TOC/hash and FAQ disclosure, checks owned
fields, loaded CSS rules and request/script failures, and records a screenshot and
complete artifact byte manifest. POST/external requests are refused; no inquiry
submission. Artifact symlinks and byte changes fail. This is separate from native
host preview and the public compiler/asset verification in `verify-build.mjs`.
Record the latter's exit/result too. Heavy runs use the machine-wide guard and
bounded process ownership/reaper policy; never bypass contention.

Create a JSON path manifest with `kind`, `family` (descriptor file), and `states`
containing exactly `created`, `moved`, `restored`. Each state's keys are paths:
`capture`, `restartBefore`, `restartAfter`, `nativeResult` (restart `proof.json`),
`build` (actual `build-evidence.json`), `visitor` (static visitor `result.json`).

```sh
node tests/native-authoring/families/acceptance-manifest.mjs "$PATH_MANIFEST" "$NEW_FINAL_MANIFEST"
```

The aggregator is capture/render evidence aggregation, not transaction dispatch
proof. Original successful move and inverse UI proof/journal files remain mandatory
separate evidence; keep their before/after digests linked in the acceptance record.
The aggregator checks exact three-state graph, membership and inverse deltas,
unchanged restart captures and matching runtime/build identities. It does not
convert supplied JSON into independently authenticated history; retain the original
logs, immutable source/provenance, actual build verification and screenshots for
independent review. It explicitly records two-child order acceptance as separate
NOT_RUN. Do not close full family acceptance on this manifest alone.

## Second-child order follow-up (separate reviewed history)

Do this only after the original three-state lifecycle is accepted. Do not add phases
to or reinterpret the existing 88-phase sequence. Record a separate follow-up:

1. Inspect the current generated grammar and qualified child model. Reuse a second
   child only if already created by this follow-up and its original proof is available.
   Otherwise create **one additional child only**, through Content UI with the same
   `content-create` admission/response protocol as `run-phase.mjs`. Obtain its ID
   from the actual successful response. A lost response requires public reconciliation,
   never another create. No parent, Mapping, template or placement is created again.
2. Save each typed Content field in a separate reviewed `content-field` intent against
   a fresh capture, with existing admission and `auditDelta`. Use a distinct question
   and answer, or school and department; set the reference to the original qualified
   parent. Set second order 2 when first order is 1 (inspect actual values first).
   Publish only this qualified draft through the supported release review. The additive
   `additionalChild` gate requires the exact existing family graph and original parent
   and child in the actual active baseline. It preserves every baseline published
   entry exactly, includes only this selected draft and rejects other drafts or a
   changed selection. Existing pair publication keeps its original validation.
   Active release identity is distinct from the later authored structural capture;
   local activation does not prove the final static artifact.
3. Once both children are published, `orderedChildren` in `order-followup.mjs` requires
   two distinct qualified IDs, same parent, finite untied order. Derive a single
   second-child order intent with `childOrderIntent(snapshot,family,kind,second,0,path)`
   (choose a distinct value below first's actual order). Execute via existing
   `run-phase.mjs`; `assertChildOrderDelta` admits only that child's order and normal
   timestamp/generation/token. Extra field/domain changes refuse.
4. Verify pre-change, changed and restored order in both native and exact built DOM.
   For native read intent embed `orderFamily` (exact accepted descriptor) and
   `secondChild` (qualified ref); frozen input capture includes them. For static
   visitor append a file containing that same qualified second-child reference to
   the command. Both use `assertChildDOMOrder`, comparing the **whole list** against
   sorted actual Content values. A renderer ignoring/reversing sort, missing or extra
   child fails. Identity stays unchanged as order changes. Capture/restart/build each
   state; preserve public full captures and runtime source/pack identities.
5. Restore the second child's original order through the same one-field admission
   at the current token, compare against the recorded original value, and prove the
   exact inverse delta/order. Preserve both children and history for review; this
   recipe grants no cleanup deletion or permission to overwrite held data.

This follows Content-owned query sorting only. It proves neither multiple parent
pin reordering nor Composition-owned parent placement. If claiming parent arrangement,
use a separately reviewed two-parent/placement operation with exact Composition delta
and rendered order; singleton pins or parent Content order999 cannot establish it.

Executable follow-up intent preparation (no writes until the existing guarded phase runner):

```sh
node tests/native-authoring/families/second-child.mjs "$SECOND_CONFIG" "$CAPTURE" "$FAMILY" "$KIND" "$SECOND_HISTORY" "$ACTIVE_IDENTITY" "$NEW_INTENT"
# SECOND_CONFIG: {"text":"distinct text","secondary":"distinct answer/department","order":2}
# SECOND_HISTORY: initially [], then paths of actual successful follow-up proof.json files.
# Run each emitted intent through the existing documented guarded run-phase.mjs.
# Stop on uncertainty and reconcile; never fabricate history or run creation again.
node tests/native-authoring/families/order-intent.mjs "$ORDER_ORIGINAL" "$ORDER_ORIGINAL" "$FAMILY" "$KIND" "$SECOND_REF" change 0 "$CHANGE_INTENT"
# After the actual successful order change and capture, prepare its guarded inverse:
node tests/native-authoring/families/order-intent.mjs "$ORDER_ORIGINAL" "$ORDER_CHANGED" "$FAMILY" "$KIND" "$SECOND_REF" inverse "$CHANGE_PROOF" "$INVERSE_INTENT"
```

`second-child.mjs` uses only actual create-response IDs and a hash-bound sequential
history; completion explicitly excludes order acceptance. `order-intent.mjs` inverse
requires the original successful field proof, exact current after-capture and complete
one-field delta before deriving the recorded prior value. Keep new intents/artifacts
exclusive; collect before/changed/restored native and static order evidence between
writes, rather than immediately applying the inverse.

Pure checks (no authoring server or store access):

```sh
pnpm exec vitest run --config tests/native-authoring/families/vitest.config.ts
```
