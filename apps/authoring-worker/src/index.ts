import { createApp } from "./app";
import { createAccessIdentity } from "./auth/identity";

// Production entry: Cloudflare Access JWT verification only. The local fixture
// identity, the seed endpoint and the fake publication provider live in
// src/local-dev.ts and are never imported here (scripts/check-worker-bundle.mjs
// scans the dry-run bundle for them). No publication provider is registered
// yet, so any PUBLISHER_PROVIDER fails closed with configuration-required; the
// GitHub provider (src/publish/github-provider.ts) registers here when it lands.

let app: ReturnType<typeof createApp> | null = null;

export default {
  async fetch(request, env): Promise<Response> {
    app ??= createApp({ identity: createAccessIdentity({ teamDomain: env.TEAM_DOMAIN, audience: env.POLICY_AUD, allowlist: env.EDITOR_ALLOWLIST }), publishers: {} });
    return app.fetch(request, env);
  },
} satisfies ExportedHandler<Env>;
