# Boundary16 family harness source rebind

The source implementation provides a proof loader and evidence-only preparer.
This document is not a descriptor, runtime authorization, or accepted family step.
No package transition or authoring mutation is authorized by preparation.

## Exact boundary and inputs

Create a new, immutable descriptor at Results boundary16, after accepted phase15
`parent-limit`. Preserve original boundary12 installation bridge, boundary13 c81
supplement, history16 and every original proof byte. Retain the failed phase16
pin attempt and read-only diagnostic FAIL263, including its complete180s observed
result, DOM, screenshots, request journal, capture equality and the post-observation
preview-assertion failure. Do not call that diagnostic a successful restart.

Manager inputs must identify the original two descriptors, accepted history16,
config and active identity, last accepted capture, distinct stopped before/after
public captures, old full installation provenance, current full installation
provenance, explicit reviewed changed-file allowlist, and an exhaustive failure
file manifest. Require before == after == phase15 after-image as complete JSON,
not digest alone. The current expected digest is
`2d7041082fbf9860ae9af5a8f872c63138e2b8626d66d2d03f1707e665edf3af`.

## Validation contract

1. Load original bridge and supplement against their sealed historical provenance.
   Verify full historical source inventory and file bytes against their actual Git
   commits. Never replace their source identities with current checkout bytes.
2. Validate all16 accepted steps, exact sequence and public capture chain, retaining
   only the existing identity gaps at12 and13. Read each actual original bundle,
   requests, responses, provenance and after-image. Preserve recovered phase11/12
   as distinct recovery proofs and all original failed states.
3. Verify old source25e and current exact clean Git HEAD separately. Their Composer
   SHA must both be `c5ffd410f74ba4b3aa003da068efeeae6e663c37`. Verify all four installed
   consumers, contract pin, all manifest/config/lock bytes, generated public pack
   and renderer identities, workspace/schema and entire capture. Permit **no**
   identity differences, token changes, assets or project edits at this boundary.
4. Compute the full tracked Git diff old→current, including additions/deletions.
   Require its exact paths and before/after hashes to equal the independently
   reviewed allowlist. Every allowed path must be under `tests/` or `docs/`.
   Reject package manifests/config/lockfiles even if located under those paths.
   All other production/runtime/source files must remain byte-identical; reject
   arbitrary source gaps, symlink/type changes and unreviewed test modifications.
5. Freeze all transitive descriptor, proof, capture, history and failure inputs.
   Preserve first-seen hash expectations on overlapping paths. Check them again
   before descriptor emission and at generation/runtime boundaries. Exclusive
   outputs only; no mutation of old evidence or authoring state.

## Implemented wiring (manager preparation after review)

The pure `source-rebind-core` proof/boundary module has a separate loader/preparer.
The CLI receives an optional final rebind descriptor argument after the original
bridge and supplement. Validate current installation through the rebind while
validating the original supplement using sealed historical installation. Carry all
three descriptor identities into generated intents and frozen bundles.

A rebind permits source qualification only at index16 and later; it cannot bypass
sequence validation, change installation gaps, authorize a save retry, or insert
an accepted phase. At16 require full snapshot equality with its sealed boundary
capture. At17+ require the next actual previous proof and the same descriptor,
current source/package and normal ownership/request gates. Without the descriptor,
old supplement/current-source mismatch must continue refusing.

Before manager preparation, test: wrong boundary/history; changed source outside
allowlist; manifest/lock or package drift; same digest but changed project; changed
old proof/failure/descriptor; conflicting duplicate hash; unclean/current-head
change; rewritten recovery status; missing installation; and actual spawned CLI
success/refusal (prevent the earlier ESM self-await cycle). Run the inert retained
DOM selector fixture before any native retry. Manager independently reviews and
prepares descriptors only after clean source integration and stopped captures.

## Manager input recipe

Create an exclusive inputs JSON with exactly the following keys (all paths
absolute; `expectedSourceHead` is the reviewed40-character Git SHA):

- `expectedSourceHead`: exact clean integrated source approved by review.
- `originalDescriptorPath`: retained boundary12 descriptor.
- `supplementDescriptorPath`: retained c81 boundary13 descriptor.
- `historyPath`: original accepted history16; do not rewrite it.
- `configPath`: original Results config.
- `beforePath`, `afterPath`: distinct stopped public captures, both full-equal to
  accepted phase15 after-image.
- `reviewedChangesPath`: sorted exact `[{path,before,after}]` tracked Git hash delta
  from original25e to the reviewed current source; absent files use null.
- `failuresPath`: object with `pin`, `diagnostic`, `extra` as described below.

`pin` maps `before`, `after`, `bundle`, `events`, `log`, `provenance` to the original
failed16 files. `diagnostic` maps those same keys plus `dom`, `screenshot`, `verified`
to the original diagnostic FAIL263 files. `extra` is an array of absolute retained
reconciliation/checkpoint/additional evidence paths, including any later corrected
diagnostic. Both mandatory failures remain failures; their public captures and
original no-write journals are checked independently.

After independent review and the manager's stopped-source audit, run:

```sh
node tests/native-authoring/families/prepare-source-rebind.mjs \
  --inputs /absolute/new-source-rebind-inputs.json \
  --artifacts /absolute/new-source-rebind-evidence
```

This command writes only new evidence outside the checkout. It performs no install,
capture, browser navigation, server startup or canonical mutation. The manager must
review `descriptor.json` and all frozen dependencies before using it as the eighth
argument to `families/sequence.mjs`, after original bridge and supplement paths.
The command refuses uncommitted source and changed production/config/manifest/lock
files. The actual next phase still requires separate runtime admission. No generated
descriptor is part of this source change.
