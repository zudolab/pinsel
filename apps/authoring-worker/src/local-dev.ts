import { createApp } from "./app";
import { createFixtureIdentity } from "./auth/identity";

// `wrangler dev --env local` entry: a fixed local subject stands in for
// Cloudflare Access. This module must never reach the production bundle
// (scripts/check-worker-bundle.mjs greps the dry-run output for the marker).
// Only the handler may be exported: workerd rejects other named exports.
const LOCAL_DEV_FIXTURE = "pinsel-local-dev-identity-fixture";

const apps = new Map<string, ReturnType<typeof createApp>>();

export default {
  fetch(request, env): Promise<Response> {
    const configured = (env as { LOCAL_DEV_SUBJECT?: string }).LOCAL_DEV_SUBJECT;
    const subject = typeof configured === "string" && configured.length > 0 ? configured : "local-dev@example.test";
    const key = `${LOCAL_DEV_FIXTURE}:${subject}`;
    let app = apps.get(key);
    if (!app) {
      app = createApp({ identity: createFixtureIdentity(subject) });
      apps.set(key, app);
    }
    return app.fetch(request, env);
  },
} satisfies ExportedHandler<Env>;
