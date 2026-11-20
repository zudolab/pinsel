# Composition output continuation admission

A file-provider `put` may return HTTP200 with `ok: needs-output`; this is an output
challenge, not a canonical save receipt. The installed client computes the requested
outputs and sends a continuation of the same logical put. The original response
journal is fsynced before the harness records the challenge state.

A client continuation can arrive before that bookkeeping finishes. Admission now
captures and joins only the Composition gate's **already enqueued** serial tail,
then classifies the request against the resulting challenge state. It never joins
itself or waits for its own challenge to disappear. The exact existing record and
output challenge validation still runs before dispatch. Wrong records, unmatched
outputs, a second canonical put, prior response uncertainty and close fences remain
refusals. No generated-output response is moved ahead of durable journaling.

Prospective admission events record operation, record ID, output IDs, observed
readiness and the later classification. They do not reconstruct missing historical
payloads. Results phase17 FAIL448 remains failed: full public state was unchanged,
with a needs-output response and no accepted canonical duplicate. A pure delayed-
response-journal regression demonstrates the race; it does not prove the precise
unlogged payload of that old attempt. Any later runtime needs separate admission,
a fresh artifact and the retained source/capture chain. Package pins are unchanged.
