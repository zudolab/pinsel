import { createApp } from "./app";
import { createAccessIdentity } from "./auth/identity";
// No deployment, delivery or scheduled publication handler is enabled.
export default { fetch(request, env) {
 return createApp({ identity: createAccessIdentity({ teamDomain: env.TEAM_DOMAIN, audience: env.POLICY_AUD, allowlist: env.EDITOR_ALLOWLIST }) }).fetch(request, env);
} } satisfies ExportedHandler<Env>;
