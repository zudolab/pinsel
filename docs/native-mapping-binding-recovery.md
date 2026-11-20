# Recover an acknowledged Results binding without replay

This narrow recovery applies to Results sequence12 (`parent-bind-label`), where
one Mapping put returned200 and the exact full public capture contains that binding,
but the original UI remained “Saving…” for180seconds. Keep that run as FAIL.
Do not click Bind, Save, Retry, or replay the phase.

Create a six-file absolute-path manifest with keys `bundle`, `bundleHash`, `before`,
`after`, `events`, `provenance`, pointing to the original attempt's
`accepted-inputs.json`, `accepted-input-sha256.json`, `before.json`, `after.json`,
`events.ndjson`, and `runtime-provenance.json`. Keep the original immutable package
and stage. Create a new intent with `kind: "mapping-saved-binding"`, that manifest's
`recoveryEvidencePath`, the original `after.json` as `capturePath`, and its exact
`captureDigest`. Use a new exclusive artifact directory.

Run the existing `run-readonly.mjs` recipe through the shared heavy guard/reaper.
All original frozen input and installation-bridge hashes are rechecked. The evidence
validator requires exactly one acknowledged Mapping put, unchanged qualified owner,
root and field, and exactly the new binding plus normal timestamp/token changes.
It rejects extra/unknown writes, missing responses, changed inputs and other failures.

The held original browser may have abandoned no-commit Composition derived-output
challenges. These remain explicitly recorded as abandoned, never relabeled settled.
Every dispatched read must have its original valid response; every output continuation
must match its challenge. The full capture must still show only the intended Mapping
delta, with no Composition/token/content/asset change.

The fresh read-only browser opens that saved Mapping, verifies Saved, performs a real
reload, observes the actual original public get of the exact saved record, and settles
all new reads before closing. It never saves. Whole public captures before and after
must equal the retained saved state. Only then may `recovery-sequence-proof.json`
contain `MAPPING_BINDING_RECOVERY_VERIFIED`, retaining `originalScenario: FAIL` and
the original source/package identity. Append that distinct proof once as index12
in a new history array; do not rewrite original phase12 evidence.

This does not extend the existing installation bridge's fixed boundary12. A later
package adoption requires a separately reviewed chained transition from the accepted
recovered state at boundary13. No new pin, cutover, deployment or live-provider
acceptance is implied by this read-only recovery.
