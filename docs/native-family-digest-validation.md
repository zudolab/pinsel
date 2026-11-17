# Family evidence digest validation

The historical family validators retain every artifact read, original-response and
semantic assertion, expected-hash comparison, collision-safe merge, and fresh final
rehash. `createExpectedReader` avoids hashing the same physical read repeatedly as
it passes through nested validators. It does not cache files, parsed JSON, prior
results, or hashes across reads.

A private registry recognizes only closed reader functions rooted in the actual
Node `readFile`. Each call creates a fresh record binding its requested path, unique
read identity, newly read Buffer and digest. Internal parents check their own
first-seen expectations before propagating that record. No Buffer escapes until
all those checks finish. The public reader returns only bytes; standalone
`inputHash` always computes their actual current digest. Concurrent calls and
aliases are independent reads.

An arbitrary supplied bytes callback can retain and mutate a Buffer alias. Its
reader and every ancestor therefore use the original independent hashing behavior.
Public properties cannot grant trusted-reader status. There is no Buffer-keyed
cache or public record, digest, branding, or trust option. Existing helper signatures
and failure behavior remain available. Absolute-path checks remain enabled at the
same loader boundaries as before.

The implementation is motivated by one instrumented historical-input profile at
Pinsel `d03e953d7f5e40fb09d69d1f427186f7dcf77eb6`: 366.15 seconds in the
saved-create loader, with 191.64 seconds sampled in hashing under
`readExpectedBytes`. That is an upper bound on addressable work, not measured
savings. The profile added its own byte callback and hashing; that callback remains
untrusted and deliberately takes the fallback. A new comparison using the default
reader requires separate reviewed admission. Git child CPU and physical disk
traffic were not measured. No new installed authoring pass follows from this change.

Run the focused family proof unit configuration. Tests use disposable files and
synthetic callbacks, covering binary parity, repeated/final disk changes,
conflicting layer expectations, mutation of returned bytes, mutable callback
aliases, forged metadata, concurrent reads and errors. Native state, model calls,
browser operations and prior frozen evidence are outside these tests.
