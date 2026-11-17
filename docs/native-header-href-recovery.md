# Recover an acknowledged Header href save without replay

Use this narrow recipe only when the Header forward saved exactly once, its original
HTTP 200 and qualified full record readback were recorded, the stopped public capture
contains only the accepted href/update-time/generation/token change, and the final
failure was the hidden responsive Header link click. Keep that original attempt as
**FAIL**. An acknowledgement alone is not completed navigation acceptance.

The responsive driver uses the actual `.menu-toggle[aria-controls="site-navigation"]`
when the exact Header link is hidden. Pinsel collapses navigation both at the 70rem
viewport breakpoint and at the Header container breakpoint. The driver does not infer
visibility from viewport width, force-click, resize, or change CSS. It checks the unique
toggle, false-to-true `aria-expanded`, `data-open`, and actual link visibility.

After stopping the original owned server, reconcile a fresh supported public capture
against the original `after.json`. Do not initialize, reseed, undo, or repeat Save.
Review and integrate this source before running it. Keep the same installed Composer
revision and stage; source-only acceptance fixes may change the clean repository head.
The runner resolves the actual installed pack and renderer through the public compiler
before opening a browser and requires complete capture equality.

Create an exclusive evidence JSON with these six absolute paths from the failed attempt:

```json
{
  "bundle": "/absolute/failed/accepted-inputs.json",
  "bundleHash": "/absolute/failed/accepted-input-sha256.json",
  "before": "/absolute/failed/before.json",
  "after": "/absolute/failed/after.json",
  "events": "/absolute/failed/events.ndjson",
  "provenance": "/absolute/failed/runtime-provenance.json"
}
```

Create a new read intent using the reconciled full public capture:

```json
{
  "kind": "header-saved-href",
  "capturePath": "/absolute/reconciled-capture.json",
  "captureDigest": "ACTUAL_SAVED_AFTER_DIGEST",
  "recoveryEvidencePath": "/absolute/saved-href-evidence.json"
}
```

Run through the environment's shared heavy guard and child reaper, with the repository
Node/pnpm toolchain, explicit installed immutable SHA, stage, unused port and exclusive
artifact directory. The inner command is:

```bash
node tests/native-authoring/families/run-readonly.mjs \
  --composer "$EXPECTED_COMPOSER_SHA" --stage "$PINSEL_AUTHORING_STAGE" \
  --intent /absolute/saved-href-read-intent.json \
  --artifacts /absolute/new-saved-href-recovery --port 4194
```

The parent hashes all input bytes and hands a hash-bound captured bundle to the child.
The browser visits the actual qualified Content editor. Its original `get-entry`
response must reproduce the complete saved record; its native `editorial-revisions`
response must be for that qualified entry, the first page with limit 10, and no more
than three such requests. No synthetic history request, private history file, pagination
or Restore is used. The latest revision must contain the saved values, `content-editor`
provenance and a `save` operation inside the acknowledged time window. Its immediate
parent must contain the prior values. The actual revision row must appear in the UI.

The browser then verifies Home Header/Footer, opens the real menu if needed, follows
the link in Browse mode, and pairs the original document-preview response with the
exact workspace/revision/route/page/pack/renderer and iframe URL. The destination title
and h2 must match the accepted static page. That page need not have a Header. A terminal
read fence settles admitted responses/challenges and closes Chromium. Unknown writes
remain fatal; this lane grants no save, publication, restore, or inverse permission.

After the owned server stops, the full public capture must remain identical. The runner
builds that exact digest only if its build directory is absent, verifies all compiled
routes and captured asset bytes, the source Header/Footer and destination HTML, and
requires another unchanged capture. Source and all input bytes are fenced throughout.
Only the resulting `recovery-proof.json` with
`SAVED_HEADER_HREF_RECOVERY_VERIFIED` is eligible for an inverse. The original failure
is not rewritten to `PUBLIC_CAPTURE_VERIFIED`.

For a separate restart, use `kind: "header-restart"`, the recovery's `afterCapture`
from its nested `restart` record, and this recovery proof as `forwardProofPath`.
For the inverse, use the ordinary Header preparer with `kind: "header"`, `currentHref`
set to the saved new route, and this recovery proof as `forwardProofPath`. It derives
only the original href and requires the exact current digest and full owner record,
completed history/preview/build evidence, and matching installed package. Run the inverse
and its restart only after review, each in a fresh exclusive attempt. On any uncertain
outcome stop and reconcile; never replay the forward or inverse automatically.

Minimal DOM tests cover desktop and collapsed navigation, already-expanded-but-hidden
state, duplicate controls and a toggle that fails to reveal the target. Pure evidence
tests cover duplicate saves/responses, stale and foreign readbacks, collateral fields,
input tampering, history scope/budgets and incomplete recovered inverse proofs. These
source tests do not claim browser recovery success.
