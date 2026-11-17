# Read-only route owner selection

This source recipe addresses representative semantic owner selection on Home,
About, Voices, Notes index, Contact and `/404.html`. It complements Lessons /
Consultation, detailed FAQ/Note Assistant, Header and authored-static-page proofs;
it does not repeat their mutations or claim every component on each route passes.
No runtime result is implied by the source or pure tests.

Use a clean independently installed consumer, its exact immutable Composer SHA,
and an existing stopped disposable stage containing known data. Do not initialize
or reseed a workspace. Review a fresh supported public capture against its accepted
predecessor. Keep other writers stopped and freeze source throughout each run.

Prepare one external intent per pathname: `/`, `/about`, `/voices`, `/notes`,
`/contact`, `/404.html`. Each has this shape:

```json
{
  "kind": "route-owner-selection",
  "pathname": "/about",
  "capturePath": "/absolute/reviewed-capture.json",
  "captureDigest": "EXACT_SUPPORTED_CAPTURE_DIGEST"
}
```

From the consumer root using Node24/pnpm11.5.2, execute each separately, sequentially
under the shared heavy guard/reaper. Supply the actual immutable installed SHA and
named stage, a free port, and a new exclusive artifact directory for every attempt:

```sh
node tests/native-authoring/route-selection/run.mjs \
  --composer EXACT_40_CHARACTER_INSTALLED_SHA --stage notes-v1 \
  --intent /absolute/about-selection-intent.json \
  --artifacts /absolute/new-about-selection-attempt --port 4214
```

The runner checks the installed pin, freezes intent/capture bytes and all tracked
source, starts its own server, and captures before/after using the supported public
API. A successful attempt requires full capture equality, including every token.
It neither builds nor publishes; exact static output remains its separate recipe.

The browser admits only the existing finite read protocols. Native
`content-preview-context` / `content-document-preview` use their reviewed request,
header, captured-record, revision and renderer validation. Unknown writes,
submission endpoints and cross-origin requests fail closed. Composition outputs
are admitted solely through the existing exact derived-read challenge gate; an
output is not permission for a canonical write. Original responses, busy retry
obligations, diagnostics and close are tracked. After all UI assertions, the
shared terminal fence aborts new ordinary reads while exact outstanding derived
continuations and already-observed busy retries settle. No Save, Apply, mutation,
form submission, visitor link or copied renderer is used.

For each real original document-preview response, workspace, saved revision,
route, pack and renderer must match the capture. Its page ID must match the
corresponding baseline page in the active captured Sitemap. The chosen primary
node is a canonical captured Composition node, rendered once, with a unique
semantic tree label, and descended through that page's main slot. Shared chrome,
transparent wrappers and art decorations cannot substitute. If no such node (or
distinct secondary semantic node) is available, the attempt refuses; inspect the
captured model instead of inventing a target or loosening ownership assertions.

Clicking the rendered primary node must select exactly one matching tree row,
show its exact component and provider/record/node owner in the Inspector, expose
the matching owning-Composition link, and highlight that same rendered marker.
Then select another rendered semantic node and press Enter on the original tree
row; all those checks must return to the original owner. The iframe URL and full
preview identity remain tied to the same saved response.

Artifacts include fsynced original request/response events, exact preview target
selection, `preview-selected.png`, `tree-reselected.png`, server diagnostics,
provenance, frozen inputs and full before/after captures. Only after close and
stopped-state equality does `proof.json` record `ROUTE_OWNER_SELECTION_VERIFIED`.
Retain failed attempts separately; never treat a screenshot or source test as a
runtime pass. A complete matrix requires six actual successful proofs at recorded
consumer/package/capture identities; existing covered route evidence stays distinct.
