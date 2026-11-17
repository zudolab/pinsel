# Recover an acknowledged Mapping create after editor-navigation failure

This narrow recipe preserves the failed original run. It does not click Create,
repeat a write, reuse the failed client ID, or manufacture its missing UI proof.
Use only after reviewing one original Mapping `put` with HTTP 200 / `{ok:true,
result:null}`, the exact Mapping-create delta in supported full captures, and the
specific missing-provider URL assertion. Other held/uncertain outcomes refuse.

The installed 5fe Mapping controller waits for `refreshLibrary()` after `put`
before the library calls `mappingDeepLinkHref`, which always includes provider
and Mapping ID. A successful response is therefore earlier than completed editor
navigation. Normal family verification now polls the same exact owner URL with
the existing 180-second bound before checking Saved and the breadcrumb. It does
not navigate on the application's behalf or accept an omitted/foreign owner.

Keep the original failed attempt immutable and retain its logs and screenshot.
Create an external JSON evidence manifest with exactly these absolute paths:

```json
{
  "before": "/original-attempt/before.json",
  "after": "/original-attempt/after.json",
  "bundle": "/original-attempt/accepted-inputs.json",
  "bundleHash": "/original-attempt/accepted-input-sha256.json",
  "events": "/original-attempt/events.ndjson",
  "provenance": "/original-attempt/runtime-provenance.json"
}
```

After a reviewed source upgrade of the stopped consumer and verified preservation
of its installed package and stage, prepare an exclusive read intent:

```json
{
  "kind": "mapping-saved-create",
  "capturePath": "/original-attempt/after.json",
  "captureDigest": "EXACT_AFTER_DIGEST",
  "recoveryEvidencePath": "/absolute/mapping-recovery-evidence.json"
}
```

Run from that consumer using Node24/pnpm11.5.2 under the shared heavy guard/reaper,
with an unused port and new artifact directory (substitute actual absolute paths):

```sh
node tests/native-authoring/families/run-readonly.mjs \
  --composer 5fe6d8d92f5013943053491794c0502b83228d53 \
  --stage notes-v1 --intent /absolute/mapping-recovery-intent.json \
  --artifacts /absolute/new-mapping-recovery-attempt --port 4208
```

The runner freezes all original evidence, audits its original Composition
challenges, requires the original package/stage, and recaptures the exact saved
state. A fresh browser opens the existing qualified Mapping, verifies Saved/name,
performs a real reload and observes its original workspace-qualified `get`. The
complete loaded record must equal the acknowledged create and public capture.
Known new reads are fenced only after these UI/read obligations; existing reads,
derived challenges, and busy retries must settle through the shared terminal
protocol. Writes remain rejected. Server shutdown and a second full public
capture must prove no changes.

Only then does `recovery-sequence-proof.json` carry
`MAPPING_CREATE_RECOVERY_VERIFIED`, the original intent/sequence/result, original
before/after delta, frozen original evidence, and a distinct
`READ_ONLY_RESTART_VERIFIED` proof. Append that absolute proof path exactly once
at the failed sequence index in the accepted history; retain the original failed
attempt separately. `sequence.mjs` checks this recovery shape before producing
the next intent. Do not replace the original run's absent `proof.json` or label it
passed. A recovery failure admits no next mutation or compensating inverse.

This verifies persistence and the actual selected Mapping editor. It does not
claim collection binding, rendered family output, publication, or static-build
acceptance; those remain later explicit family phases.
