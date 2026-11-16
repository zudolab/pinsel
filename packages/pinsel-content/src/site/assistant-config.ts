/** Trusted server configuration. No credentials or provider settings enter Content. */
export function pinselAssistantConfig(env: Readonly<Record<string, string | undefined>>) {
  const provider = env.PINSEL_ASSISTANT_PROVIDER;
  if (provider === undefined || provider === "") return undefined;
  const common = {
    name: "Pinsel Assistant",
    permission: "apply" as const,
    contentFields: [
      { providerId: "content-filesystem", modelId: "course", fieldIds: ["course-price"] },
      { providerId: "content-filesystem", modelId: "faq-item", fieldIds: ["faq-item-question", "faq-item-answer"] },
      { providerId: "content-filesystem", modelId: "home-faq", fieldIds: ["home-faq-question", "home-faq-answer"] },
      { providerId: "content-filesystem", modelId: "note", fieldIds: ["note-title", "note-body"] },
    ],
  };
  if (provider === "fake") return { ...common, provider };
  if (provider !== "anthropic" && provider !== "claude-cli" && provider !== "codex-cli") {
    throw new Error("Unsupported PINSEL_ASSISTANT_PROVIDER; choose anthropic, claude-cli, codex-cli or explicit offline fake.");
  }
  const model = env.PINSEL_ASSISTANT_MODEL;
  const effort = env.PINSEL_ASSISTANT_EFFORT;
  if (!model || (effort !== "low" && effort !== "medium" && effort !== "high")) {
    throw new Error("Set PINSEL_ASSISTANT_MODEL and PINSEL_ASSISTANT_EFFORT explicitly; provider settings are never inferred from another session.");
  }
  const serviceTier = env.PINSEL_ASSISTANT_SERVICE_TIER;
  if (serviceTier && provider !== "codex-cli") throw new Error("PINSEL_ASSISTANT_SERVICE_TIER is supported only by codex-cli.");
  if (provider === "anthropic") return {
    ...common, provider, model, effort,
    apiKeyEnv: "PINSEL_ASSISTANT_API_KEY",
    ...(env.PINSEL_ASSISTANT_BASE_URL ? { baseUrl: env.PINSEL_ASSISTANT_BASE_URL } : {}),
  };
  if (env.PINSEL_ASSISTANT_BASE_URL) throw new Error("PINSEL_ASSISTANT_BASE_URL is supported only by anthropic.");
  return {
    ...common, provider, model, effort,
    ...(serviceTier ? { serviceTier } : {}),
  };
}
