# Fixed boundary18 create handoff

This evidence-only source transition follows the genuine accepted phase17 duplicate.
It is fixed to boundary18 and c5. It does not authorize arbitrary source gaps, a
package change or a canonical retry. Keep original boundary12/13/16 descriptors and
boundary17 successor unchanged. Future intents additionally carry
`familySourceCreateHandoff`; historical intents remain byte-identical.

The loader verifies the original boundary17 installation/source against Git before
loading that descriptor, then verifies accepted history18: its seventeen-item prefix,
original duplicate request/output challenge and exact continuation, canonical saved
receipt, full delta, qualified original reload readback, settled reads and original
complete harness inventory. Original phase18 FAIL493 is separately frozen with its
full unchanged5f20 before/after, exact create intent, no canonical dispatch, original
read/challenge responses and timeout. Any unfinished read challenges remain reported;
this failed attempt never becomes an accepted history entry.

Current and historical installations, four package roots/manifests/installed lock,
pack/renderer/schema and complete public captures must agree. Distinct stopped
before/after captures must both equal accepted phase17 after-image. Only an exact
independently reviewed sorted tests/docs hash delta with unchanged Git modes is
allowed. Runtime, config, manifests and lock changes refuse. First-seen hashes are
retained across overlapping paths and all dependencies are frozen transitively.

After audited source upgrade, prepare an exclusive inputs JSON with exactly:

- `originalDescriptorPath`, `supplementDescriptorPath`, `parentDescriptorPath`:
  unchanged boundary12/13/16 records.
- `successorDescriptorPath`: unchanged boundary17 descriptor.
- `historyPath`: accepted history18; never patch the old array.
- `failurePath`: original failed18 manifest with exactly `before`, `after`, `bundle`,
  `bundleHash`, `events`, `provenance`, `log`, `extra` (additional preserved evidence).
- `beforePath`, `afterPath`: distinct stopped public captures.
- `reviewedChangesPath`: exact sorted `{path,before,after}` reviewed hash delta.
- `expectedSourceHead`: exact independently reviewed current Git SHA.

All paths are absolute. Only after independent input review:

```sh
node tests/native-authoring/families/prepare-source-create.mjs \
  --inputs /absolute/reviewed-inputs.json \
  --artifacts /absolute/new-exclusive-evidence
```

This emits evidence only, never a capture/server/browser/install or canonical write.
Review the emitted descriptor independently. Pass it as the tenth positional argument
to `sequence.mjs`, after all four retained descriptors. Older zero-through-nine argument
calls retain their original checks. The pure generator imports no CLI entry module.
Actual runtime requires separate admission, a new exclusive attempt and shared guard;
failed/uncertain writes stop dependent work and must never be replayed blindly.
