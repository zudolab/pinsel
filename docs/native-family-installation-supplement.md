# Second family installation transition: boundary13

This defines a separately sealed second installation transition. The commands below require manager-approved preparation and runtime evidence for
each installation. The c5 rehearsal and phase13 pass are recorded in the
[compatibility ledger](composer-compatibility.md#historical-c5-installed-checkpoint--2026-11-17).
The first transition remains the sealed boundary12 descriptor and its original
package/source identities. A second transition is allowed only after genuine
`MAPPING_BINDING_RECOVERY_VERIFIED` evidence for saved Results phase12.

The supplement must seal the original descriptor, every original proof, the failed
phase12 write evidence, actual completed recovery artifacts, and new manager stopped
captures. Validate the old descriptor against its original sealed installation as
historical evidence; never label it as current. Validate the new installation using
all four actual immutable packages, current source and public pack/renderer identity.

`validateBindingRestartEvidence` requires the original one-put validator, exact
unchanged recovery captures, original restarted public Mapping responses, settled
new derived reads, the original failure status, and the recovery bundle's recorded
hashes. The file loader independently reads, freezes and rechecks every referenced byte
with the existing retain-on-reread helpers before calling these pure functions.

`familyInstallationSupplementProof` requires manager-before to equal the accepted
recovery-after capture completely. Only the existing four installation identity
paths may change in manager-after. Content, Composition, Mapping, Sitemap, all tokens,
Assets, schemas and unknown fields remain exact. The current package must differ
from the original binding's package. This is exactly boundary13, not arbitrary gaps.

`assertFamilySupplementBoundary` preserves original indices00–11 and the exact
recovery proof at12. The digest gap at12 belongs solely to the original bridge;
the additional gap at13 belongs solely to this supplement. All later transitions
still require normal exact phase continuity. Never patch old descriptors/history or
replay the saved binding. Runtime generator/runner wiring and evidence preparation are implemented below;
execution still requires actual current-package recovery success.

## Implemented preparation and continuation commands

The loader/preparer and generator/runtime wiring are implemented. The recorded c5
rehearsal verifies one actual second installation; new installations still require
their own approved inputs and frozen evidence.

After genuine current-package recovery, create a JSON recovery manifest with exactly
`bundle`, `before`, `after`, `events`, `provenance`, `restart`, `proof`, pointing to
that new recovery directory's `accepted-inputs.json`, captures, `events.ndjson`,
`runtime-provenance.json`, `proof.json` and `recovery-sequence-proof.json`.
Keep the original boundary12 descriptor unchanged. Create a separate failure-file
manifest retaining the acknowledged failed phase12, its logs/reconciliation and the
recovery evidence; these are frozen, never promoted into original successful runs.

Manager command (all file/directory arguments absolute):

```sh
node tests/native-authoring/families/prepare-installation-supplement.mjs \
  --original-bridge /evidence/original/descriptor.json \
  --recovery /evidence/recovery-manifest.json \
  --failures /evidence/retained-failure-files.json \
  --before /evidence/stopped-before-install.json \
  --after /evidence/stopped-after-install.json \
  --composer FULL_NEW_PACKAGE_SHA --stage notes-v1 \
  --artifacts /evidence/new-exclusive-supplement
```

Preparation reads public captures and immutable Git source evidence. It does not
install, initialize, capture, start a server, save, publish or activate anything.
The historical source inventory and bytes must match its recorded Git commit;
current files are never treated as the previous installation. Every overlapping
path retains its first expected hash. Current four-package/source/public identities
are checked before emitting the exclusive descriptor and again on consumption.

Generate phase13 from the thirteen-entry history containing the distinct actual
recovery proof at12. The last two arguments are the original descriptor and new
supplement descriptor:

```sh
node tests/native-authoring/families/sequence.mjs \
  CONFIG NEW_CAPTURE HISTORY_13 ACTIVE NEW_INTENT \
  ORIGINAL_DESCRIPTOR SUPPLEMENT_DESCRIPTOR
```

The normal guarded `run-phase.mjs` consumes both descriptors from that new intent,
rechecks all sealed historical/recovery/current inputs, then still requires a fresh
whole capture before any browser gesture. Only actual phase success permits the
next history entry. A source/package change invalidates the current supplement;
never edit a descriptor to force it through.
