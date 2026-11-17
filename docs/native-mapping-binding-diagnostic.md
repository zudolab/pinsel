# Read-only Mapping binding investigation

Use this only to diagnose a retained Results parent Mapping whose binding phase
has not dispatched a write. It does not authorize a binding retry or add a family
sequence proof. Preserve the original failures and accepted history.

Create a new JSON intent with `kind: "mapping-binding-diagnostic"`, the absolute
accepted public `capturePath`, its `captureDigest`, the actual Mapping `owner`
(providerId/recordId), `title: "Results year"`, and the captured root node's
`target: { nodeId, prop: "label" }`. Validation requires that Mapping's qualified
Composition to have exactly that `pinsel.year-section` root.

Run the documented `tests/native-authoring/families/run-readonly.mjs` command with
`--composer <installed immutable SHA> --stage <existing stage> --port <free owned port>
--intent <new intent> --artifacts <new exclusive directory>` through the shared
heavy guard and child reaper. Do not initialize, reinstall, activate, or bind.

The existing frozen-input, original-response, readonly transport, challenged
derived-output, terminal close and whole-public-capture equality guards apply.
The observer navigates directly to the qualified Mapping and samples for at most
180 seconds, ending earlier if all predicates hold. Its journal records URL,
Saved status count/state, exact name visibility, exact target count/visibility/
enabled state, and pending/outstanding Composition reads separately. It also
retains original responses, a DOM snapshot and screenshot before terminal cleanup.
No button is clicked. `MAPPING_BINDING_DIAGNOSTIC_OBSERVED` with `ready: false`
means the read-only observation finished, not that binding readiness passed.
The outer `READ_ONLY_RESTART_VERIFIED` proves unchanged captured state only;
it is not a completed binding step. Investigate the predicate/response evidence
and obtain independent source review before any subsequent canonical phase.
