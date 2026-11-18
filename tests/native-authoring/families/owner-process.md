# Family server ownership

The family runner launches the unchanged `start-native.ts` with Node24 and the
installed public `tsx` import. It uses the content package cwd and the same explicit
`tsconfig.scripts.json`, stage and Composer identity. It does not invoke the tsx
CLI/pnpm signal relay or change the ordinary product scripts.

Stop sends SIGTERM once to the exact owned Node child. The existing entry awaits
public `server.close()`, including Composer middleware/coordination drain and lease
release. The runner awaits child `close` (including stdio), requires exit0 without a
signal, then requires host-root lease absence and free port before offline capture.
A 120-second observation timeout fails closed: no SIGKILL, process-group kill,
automatic lease removal, capture or replay. A still-live owner must be reconciled
separately; a timeout is not permission to stop persistence. Repeated stop calls
share the same promise and never resend the signal.

Original phase22 FAIL549 and its separate authorized lease recovery stay recorded.
The original terminating signal/close stage is unknown; the wrapper interaction is
a source-supported risk, not a proven cause. Direct-owner fixtures do not establish
that an actual native authoring run passed. Auxiliary processes and process cwd
visibility require separate terminal audit; child close is not a universal process
inventory.

Run focused disposable tests (no native workspace/store/browser):

```sh
FAMILY_TEST_DEPENDENCIES=/absolute/path/to/existing/node_modules \
  node --test tests/native-authoring/families/owner-process.node-test.mjs
```

The dependency path is only a fixture symlink under a new temporary directory.
The test imports the installed public `tsx`, proves TypeScript alias/argument/env
parity and delayed graceful shutdown beyond both30ms relay windows. Other tests
exercise late stdio, duplicate stop, timeout, signal/nonzero exits, retained dangling
lease symlink, spawn failure and occupied port. Fixtures remove only their own
new temporary state; the production helper never removes a lease.
