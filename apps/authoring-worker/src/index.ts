import { createApp } from "./app";
import { createAccessIdentity } from "./auth/identity";
import { githubPublisherFactory } from "./publish/github-provider";
import { reconcileScheduled } from "./publish/reconcile";
import { PINSEL_SITE } from "./site/baseline";

// Production entry: Cloudflare Access JWT verification only. The local fixture
// identity, the seed endpoint and the fake publication provider live in
// src/local-dev.ts and are never imported here (scripts/check-worker-bundle.mjs
// scans the dry-run bundle for them). The GitHub provider is registered but
// stays off: PUBLISHER_PROVIDER defaults to "disabled" and `github` also needs
// its repository and token launch inputs (docs/publication.md).

const publishers = { github: githubPublisherFactory() };
let app: ReturnType<typeof createApp> | null = null;

export default {
  async fetch(request, env): Promise<Response> {
    app ??= createApp({ identity: createAccessIdentity({ teamDomain: env.TEAM_DOMAIN, audience: env.POLICY_AUD, allowlist: env.EDITOR_ALLOWLIST }), publishers });
    return app.fetch(request, env);
  },
  // Runs only if a cron trigger is added at launch AND PUBLICATION_RECONCILE_SCHEDULE=enabled.
  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(reconcileScheduled(env, PINSEL_SITE, publishers).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
