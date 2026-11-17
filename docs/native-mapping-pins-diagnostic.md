# Read-only Ordered pins investigation

This diagnostic observes a retained Results parent Mapping after a phase16 pin
attempt failed before dispatch. It never opens Choose, checks an Entry, saves,
retries the operation or produces a family sequence proof.

Use `kind: "mapping-pins-diagnostic"`, the exact qualified Mapping `owner`,
`capturePath`/`captureDigest` of the latest accepted public capture, and an absolute
`diagnosticEvidencePath`. That evidence JSON maps exactly `before`, `after`,
`intent`, `events`, `bundle`, `provenance` to the original failed attempt files,
and `history` to accepted history16. The loader freezes all those files, every
original bundled hash, all history proofs and the last accepted capture. It
requires whole original before/after/current equality, the exact parent-pin
intent at index16, zero original canonical dispatch/response events, and the
accepted phase15 after-image. Preserve original failures and both installation
bridge records. Do not pass them as new transition authorizations: their frozen
original bytes are retained through the failed bundle.

After independent source/input review and an audited consumer source upgrade,
use the existing `families/run-readonly.mjs` command with the installed immutable
Composer SHA, existing stage, owned free port, new exclusive intent/artifacts and
shared guard/reaper. Never initialize or reinstall as part of this observation.

The observer samples for at most the existing180seconds, ending early only if all
qualified readiness predicates hold. It records owner URL, Saved/name, Mapping
mode, original exact Ordered pins heading/section/Choose counts, target visibility
and enabled state, source-unavailable banner, pending Composition reads/challenges,
all h3 text/label attributes, exact `Ordered pins Choose` heading count and global
Choose count. These separate slow definition resolution from a selector mismatch;
installed source labels alone prove neither runtime cause.

The existing transport rejects canonical mutations, preserves original responses
and validates challenged derived outputs. DOM and screenshot are saved before
terminal fencing/settlement. Full public captures must remain equal after server
shutdown. `MAPPING_PINS_DIAGNOSTIC_OBSERVED` with `ready:false` is diagnostic
completion, never permission to apply pins or a sequence PASS. Review actual
predicates and DOM before proposing a driver change or any subsequent operation.
