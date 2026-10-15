# Local authentication and edited-publication gates

Issue [#28](https://github.com/zudolab/pinsel/issues/28) adds maintained checks to every ordinary CI `build` job. The historical #27 results in [cms.md](cms.md) and [the completed #1 report](https://github.com/zudolab/pinsel/issues/1#issuecomment-6139039236) are separate evidence.

Use Node 24, pnpm 11.5.2 via corepack, Git, curl and OpenSSL on Linux/macOS/WSL. From a frozen install, run `pnpm content:assemble`, `pnpm build:editor`, and `pnpm assets:assemble-worker`, then:

```sh
pnpm verify:auth
pnpm verify:publication
```

Heavy local runs use the workspace's heavy-test guard. Missing prerequisites fail explicitly. Commit tracked source changes first: publication rehearses the exact current Git HEAD, and authentication requires an assembly naming that HEAD. No external prototype archive or application credentials are needed.

- **Authentication:** the actual `src/index.ts` production entry, with its real remote-JWKS verification using a fresh RSA key and HTTPS fixture on loopback. It checks unauthenticated UI/assets/preview/API, invalid/expired JWTs, wrong issuer/audience, identity allowlist, missing configuration, CSRF, unsupported content type, refused-write isolation and an authenticated save. Fixture identity never substitutes for Access in this gate.
- **Publication:** a detached disposable local clone of HEAD, no remote, its own copied frozen dependency installation and local D1. It assembles that baseline, saves a derived price and identifiable detail FAQ answer through the real fixture-identity Worker, captures a snapshot, and proves it remains immutable after a later edit. `write-snapshot-files.ts` uses the publisher's actual serialization; a local-only commit has exactly the recorded baseline as its parent.
- The existing allowlist, record/package/base identity, content validation, assembly/digest, projection, `zfb check`, site build, publication checker, exclusions, fragments, assets and seed checks run against the edited output. The identity report is generated locally. The real validators must reject a forbidden config path, a tampered digest and a wrong baseline; the restored permitted edit must pass.
- Price changes appear on `/` and `/lessons/`; the detail FAQ edit appears on `/faq/`. Independently authored home FAQ records remain unchanged. The caller's canonical content and baseline site dist are never written by the rehearsal. The historical checker remains required for the unedited migration lane, not for edited output.

Each run uses its own temporary directory and ephemeral loopback ports. Requests are bounded (10 seconds; curl connect timeout 2 seconds), startup is bounded at 90 seconds, build commands at 180 seconds, and Worker lifetime at 300 seconds. Cleanup terminates owned process groups, closes the JWKS server and removes only that run's directory on success, failure, SIGINT or SIGTERM. SIGKILL cannot run JavaScript cleanup; a forcibly killed environment may retain its temporary directory until the environment is discarded.

Sanitized JSON reports are `.reports/worker-auth-probe.json` and `.reports/publication-rehearsal.json` (`--report <path>` overrides). They record source SHA, commands/outcomes and cleanup; publication also records snapshot/base/package identity and the local identity report. CI uploads only these explicit paths, never databases, keys, snapshots or rehearsal archives. JWTs and private keys are omitted.

Failure controls deliberately return nonzero and still write cleanup evidence:

```sh
pnpm verify:auth --fail-startup --report .reports/auth-startup-failure.json
pnpm verify:auth --fail-request --report .reports/auth-request-failure.json
pnpm verify:publication --fail-startup --report .reports/publication-startup-failure.json
pnpm verify:publication --fail-request --report .reports/publication-request-failure.json
```

Startup failure supplies an invalid local CLI option; request failure stops the owned Worker before the next request. Neither is a skip or a successful gate. Re-run the normal commands to establish success after each control.

No deployment, live content publication, remote D1 operation, provider mutation or real inquiry is performed. Hostnames, Access, remote D1, provider credentials, promotion policy, deployment connection, indexing and contact delivery remain [pending launch inputs](../launch-inputs.md).
