import { fakePublisherHandler } from "./admin/fake-publisher";
import { localSeedHandler } from "./admin/seed";
import { createApp, type AdminHandler } from "./app";
import { createFixtureIdentity } from "./auth/identity";
import { createFakePublicationProvider } from "./publish/fake-provider";

// `wrangler dev --env local` entry: a fixed local subject stands in for
// Cloudflare Access, `POST /admin/seed` and the `/admin/fake-publisher` driver
// are compiled in, and `PUBLISHER_PROVIDER=fake` selects the in-memory fake
// provider. This module must never reach the production bundle
// (scripts/check-worker-bundle.mjs greps the dry-run output for the markers).
// Only the handler may be exported: workerd rejects other named exports.
const LOCAL_DEV_FIXTURE = "pinsel-local-dev-identity-fixture";

const apps = new Map<string, ReturnType<typeof createApp>>();
// One fake per isolate, shared by every local subject, like a single remote provider.
const fake = createFakePublicationProvider();
const fakeDriver = fakePublisherHandler(fake);
const admin: AdminHandler = async (request, url, context) => (await localSeedHandler(request, url, context)) ?? fakeDriver(request, url, context);

export default {
  fetch(request, env): Promise<Response> {
    const configured = (env as { LOCAL_DEV_SUBJECT?: string }).LOCAL_DEV_SUBJECT;
    const subject = typeof configured === "string" && configured.length > 0 ? configured : "local-dev@example.test";
    const key = `${LOCAL_DEV_FIXTURE}:${subject}`;
    let app = apps.get(key);
    if (!app) {
      app = createApp({ identity: createFixtureIdentity(subject), admin, publishers: { fake: () => fake } });
      apps.set(key, app);
    }
    return app.fetch(request, env);
  },
} satisfies ExportedHandler<Env>;
