# Family server ownership and shutdown

The family runner launches unchanged authority/preflight logic in `start-native.ts`
with Node24, installed public `tsx`, package cwd and exact tsconfig. An explicit
nonce plus inherited Node IPC channel opts into the parent-only control protocol;
ordinary `pnpm dev` without that opt-in retains its existing signal behavior.
No HTTP endpoint, private Composer API or removal of Vite signal handlers is used.

Ready/stop/closed messages bind protocol version, launch nonce, actual Node PID,
port and host root. Before browser work the runner requires matching ready,
a regular lease owned by that Node and a responding loopback endpoint. One stop
message calls the shared memoized public `server.close()` with a keep-alive.
The child sends closed only after fulfilled close and awaits the send callback
before exit0. Rejection/channel/protocol failures never report success.

The parent requires matching closed, child `close` exit0/signalnull (stdio drained),
lease absence and free port before offline capture. Duplicate stops share a promise.
The120-second observation timeout is failure, never permission to send a signal,
SIGKILL, unlink a lease, retry a write or start capture. Startup has a separate
180-second ready bound. Preserve failed logs and the full IPC trace, including
primary and secondary errors. Reconcile any remaining live owner separately.

Original22 FAIL549 and23 FAIL427 remain preserved. Installed Vite's SIGTERM handler
awaits close but calls exit in finally;143 does not distinguish successful close
from rejection. The IPC path invokes public close without delivering that signal.
No actual native family scenario is established by the disposable fixtures.

Focused tests (existing installed dependencies; no install/native store/browser):

```sh
FAMILY_TEST_DEPENDENCIES=/absolute/path/to/existing/node_modules \
  node --test tests/native-authoring/families/owner-process.node-test.mjs
```

The real installed Vite/tsx fixture uses new temporary files, aliases and a local
HTTP listener with no authoring workspace. It retains Vite's SIGTERM handler and
closes via IPC after more than15seconds using the default timeout. Other fixtures
cover mismatched identity, missing acknowledgement/early143 or0, close rejection,
channel loss, duplicate stops, late logs, timeout and retained/symlink leases.
Only fixture-owned temporary files are removed; the helper never removes leases.
