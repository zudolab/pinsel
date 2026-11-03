/** Trusted startup settings only. CLI isolation does not import personal defaults. */
/** @param {NodeJS.ProcessEnv} env */
export function aiProviderConfig(env) {
 const provider = env.PINSEL_AI_PROVIDER ?? "fake";
 if(env.PINSEL_AI_FAKE_FIELD!==undefined && (provider!=="fake" || !["title","body"].includes(env.PINSEL_AI_FAKE_FIELD))) throw new Error("PINSEL_AI_FAKE_FIELD is a fake-only acceptance fixture: title or body");
 if (provider !== "fake" && provider !== "claude-cli" && provider !== "codex-cli") throw new Error("PINSEL_AI_PROVIDER must be fake, claude-cli or codex-cli");
 const model = env.PINSEL_AI_MODEL, effort = env.PINSEL_AI_EFFORT, serviceTier = env.PINSEL_AI_SERVICE_TIER;
 if (provider === "fake") {
  if ([model, effort, serviceTier].some(value => value !== undefined)) throw new Error("fake takes no PINSEL_AI_MODEL, PINSEL_AI_EFFORT or PINSEL_AI_SERVICE_TIER");
  return { provider };
 }
 if (!model || !/^[A-Za-z0-9][A-Za-z0-9._:[\]-]{0,99}$/.test(model)) throw new Error("Explicit valid PINSEL_AI_MODEL is required for CLI providers");
 if (effort !== "low" && effort !== "medium" && effort !== "high") throw new Error("Explicit PINSEL_AI_EFFORT (low, medium or high) is required for CLI providers");
 if (provider === "claude-cli") {
  if (serviceTier !== undefined) throw new Error("PINSEL_AI_SERVICE_TIER is unsupported for claude-cli");
  return { provider, model, effort };
 }
 if (!serviceTier || !/^[a-z][a-z0-9_-]{0,63}$/.test(serviceTier)) throw new Error("Explicit valid PINSEL_AI_SERVICE_TIER is required for codex-cli");
 return { provider, model, effort, serviceTier };
}
