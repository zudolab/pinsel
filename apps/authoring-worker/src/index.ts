import { createApp } from "./app";
import { createAccessIdentity } from "./auth/identity";

// Production entry: Cloudflare Access JWT verification only. The local fixture
// identity lives in src/local-dev.ts and is never imported here
// (scripts/check-worker-bundle.mjs scans the dry-run bundle for it).

let app: ReturnType<typeof createApp> | null = null;

export default {
  async fetch(request, env): Promise<Response> {
    app ??= createApp({ identity: createAccessIdentity({ teamDomain: env.TEAM_DOMAIN, audience: env.POLICY_AUD, allowlist: env.EDITOR_ALLOWLIST }) });
    return app.fetch(request, env);
  },
} satisfies ExportedHandler<Env>;
