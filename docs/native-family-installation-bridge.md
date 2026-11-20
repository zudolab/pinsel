# Continue retained Results history after an immutable installation

This bridge supports the reviewed Results history boundary **00–11 (12 proofs)**,
including the separate Mapping-create recovery. It does not replay those phases,
rewrite their package/source identities, or promote the failed create/binding runs.
The manager owns source upgrades, pins, frozen installation and stopped public
captures. Do not initialize, publish, activate, or change saved state to build a bridge.

After independent review and a manager-audited installation, use Node24 and the
repository pnpm version. Run `node tests/native-authoring/families/prepare-installation.mjs`
with absolute evidence paths:

- `--history`: original twelve-element proof-path array, unchanged.
- `--config`: original Results configuration.
- `--failures`: reviewed JSON array of retained failure/recovery/diagnostic evidence
  file paths, including the failed11 and all failed12 attempts. Include their logs,
  captures, journals, provenance and existing reconciliation records. They are sealed
  as historical evidence and never added as successful sequence entries.
- `--before`: manager's fresh stopped public capture, equal to accepted recovery11.
- `--after`: manager's stopped public capture after the new immutable installation.
- `--composer`: actual new forty-character package SHA; `--stage`: existing stage.
- `--artifacts`: new exclusive directory outside the checkout.

Preparation verifies original committed harness hashes, frozen inputs, public
capture chain, original write responses, exact domain deltas, release plan/build/
activation receipts and the distinct acknowledged-create recovery. It checks all
four current installations, source identity and public pack/renderer identities.
Only digest, pack digest/compiler and renderer digest may differ across installation;
the complete saved project, assets, tokens, schemas and unknown fields must match.
No capture is assembled from storage files. Preparation writes evidence only and
returns `FAMILY_INSTALLATION_EVIDENCE_PREPARED_RUNTIME_NOT_RUN`.

The resulting `descriptor.json` is an optional final argument to the existing
`sequence.mjs CONFIG CAPTURE HISTORY ACTIVE OUT DESCRIPTOR` command. Use the new
accepted capture, and keep the original history array. The generator independently
verifies the frozen bridge and carries its descriptor in the next intent. The normal
run-phase runner revalidates current installation and every frozen bridge dependency
before starting. Runtime still requires a fresh whole capture equal to the intent;
normal original-request gates, reload proof, exact delta and cleanup remain required.

After an actual successful phase12, append its real proof once to a **new** history
file. Pass the same descriptor on subsequent generator calls. The installation
identity gap is allowed exactly once between original11 and resumed12; all later
phase digest continuity remains strict. No complete family acceptance is implied:
remaining creation, rendering, ordering, restart, static build and visitor tests
still need actual current-package evidence. Any source/package change invalidates
the prepared installation witness; obtain a reviewed manager bridge, never patch it.
