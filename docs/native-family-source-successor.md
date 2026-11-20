# Fixed boundary17 source-rebind successor

This evidence-only mechanism qualifies one reviewed tests/docs source change after
accepted Results phase16. It is not a generic source-gap API, a package transition,
a successful phase17 or permission to retry a write. Original boundary12/13
installation records and boundary16 source rebind remain unchanged.

The historical boundary16 installation at7b is verified independently against its
full committed Git inventory. Its original descriptor is loaded with that sealed
historical installation, never the current checkout. The accepted history17 prefix
must preserve the first16 paths/proofs and actual phase16 original request, single
200 response, exact Mapping delta, reloaded public record, settled reads, source,
installation and frozen inputs. The failed17 original challenge is separately
validated through the existing duplicate/output-exchange contracts: one original
put, one needs-output response, no later recorded commit, complete before/after
capture equality, and absence of the proposed record. Its FAIL and close evidence
remain frozen. Missing continuation alone is never used to infer saved state.

The successor requires full stopped before == after == accepted phase16 after-image
(`6a7e3bca691245240e7ca120f76e6c7ff817c74ac4cd003bc85ca10ca4f8a608`). It permits no
changes to c5, four installed packages, public pack/renderer/schema identities,
workspace tokens, Assets or project. The exact reviewed7b→current hash delta must
contain tests/docs only; runtime files, manifests, locks, config and file modes stay
unchanged. The current source must match the explicit reviewed SHA and be clean.

## Manager inputs and preparation

After independent source review and audited stopped consumer upgrade, prepare a new
inputs JSON with exactly these keys:

- `originalDescriptorPath`, `supplementDescriptorPath`: retained boundary12/13.
- `parentDescriptorPath`: unchanged boundary16 descriptor (freeze90d690).
- `historyPath`: original accepted history17, never rewritten.
- `failurePath`: original failed17 manifest described below.
- `beforePath`, `afterPath`: distinct stopped public captures, both full-equal to
  the accepted phase16 after-image.
- `reviewedChangesPath`: independently reviewed sorted `{path,before,after}` hash
  delta from7b to the new source; absent file sides use null.
- `expectedSourceHead`: exact current reviewed40-character Git SHA.

Every path is absolute. The failure manifest has exactly `before`, `after`, `bundle`,
`bundleHash`, `events`, `log`, `provenance`, `extra`. They point to original failed17
capture/bundle/hash/journal/log/provenance files; `extra` lists retained reconciliation
and additional review evidence. Original descriptors preserve all earlier failures
transitively. First-observed hash expectations cannot be replaced on repeated reads.

```sh
node tests/native-authoring/families/prepare-source-successor.mjs \
  --inputs /absolute/reviewed-successor-inputs.json \
  --artifacts /absolute/new-successor-evidence
```

The preparer writes only exclusive external evidence. It never installs, captures,
starts a server, invokes a browser, edits canonical state or modifies old records.
Its descriptor still requires independent review and separate runtime admission.

## Sequence and runtime

Pass the successor descriptor as the ninth positional argument to `sequence.mjs`,
after the original bridge, supplement and boundary16 rebind. Generated intents keep
`familySourceRebind` unchanged and add `familySourceRebindSuccessor`. At index17,
full capture equality with the successor boundary is mandatory. At later indices,
normal sequence continuity and the exact successor descriptor are mandatory. The
old12/13 installation and16 source boundary checks remain active. Omitting the
successor after a checkout change continues to refuse the old current-source check.

Actual next runtime still uses a new intent/artifact and the shared guard/reaper;
any failed or uncertain operation stops dependent writes. A descriptor is not a
runtime pass and must never turn the original failed17 into a history entry.
