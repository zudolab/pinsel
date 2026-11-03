import { localAiHandler } from "./ai/handler";
import { createApp } from "./app";
import { createFixtureIdentity } from "./auth/identity";
// Isolated local entry; no unauthenticated identity in the production bundle.
const LOCAL_DEV_FIXTURE = "pinsel-local-dev-identity-fixture";
const app = createApp({ localAi: localAiHandler, identity: createFixtureIdentity(`${LOCAL_DEV_FIXTURE}@example.test`) });
export default { fetch: (request, env) => app.fetch(request, env) } satisfies ExportedHandler<Env>;
