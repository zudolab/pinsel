import { describe, expect, it } from "vitest";
import { pinselAssistantConfig } from "../site/assistant-config";
import { PINSEL_MODELS } from "../models";
import { loadHostContext } from "zudo-composer/vite";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

describe("native Assistant configuration", () => {
  it.each(["fake", "anthropic", "claude-cli", "codex-cli"])("passes the installed public parser for %s", async provider => {
    const input = pinselAssistantConfig({
      PINSEL_ASSISTANT_PROVIDER: provider,
      PINSEL_ASSISTANT_MODEL: "test-model",
      PINSEL_ASSISTANT_EFFORT: "medium",
    });
    const root = await mkdtemp(join(tmpdir(), "pinsel-assistant-config-"));
    try {
      await symlink(fileURLToPath(new URL("../../node_modules", import.meta.url)), join(root, "node_modules"), "dir");
      await writeFile(join(root, "zudo-composer.config.ts"), `export default ${JSON.stringify({ pack: "@pinsel/ui/composer-pack", assistant: input })};`);
      const { composerConfig } = await loadHostContext({ workspaceRoot: root });
      expect(composerConfig.assistant?.provider).toBe(provider);
      expect(composerConfig.assistant?.contentFields).toEqual(input?.contentFields);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires explicit opt-in and never falls back to an offline provider", () => {
    expect(pinselAssistantConfig({})).toBeUndefined();
    expect(() => pinselAssistantConfig({ PINSEL_ASSISTANT_PROVIDER: "unknown" })).toThrow("Unsupported");
    expect(() => pinselAssistantConfig({ PINSEL_ASSISTANT_PROVIDER: "codex-cli" })).toThrow("explicitly");
    expect(pinselAssistantConfig({ PINSEL_ASSISTANT_PROVIDER: "fake" })?.provider).toBe("fake");
  });

  it("preserves explicit model, effort and Codex service tier", () => {
    expect(pinselAssistantConfig({
      PINSEL_ASSISTANT_PROVIDER: "codex-cli", PINSEL_ASSISTANT_MODEL: "gpt-6.1-sol",
      PINSEL_ASSISTANT_EFFORT: "high", PINSEL_ASSISTANT_SERVICE_TIER: "priority",
    })).toMatchObject({ provider: "codex-cli", model: "gpt-6.1-sol", effort: "high", serviceTier: "priority" });
    expect(() => pinselAssistantConfig({
      PINSEL_ASSISTANT_PROVIDER: "claude-cli", PINSEL_ASSISTANT_MODEL: "opus",
      PINSEL_ASSISTANT_EFFORT: "medium", PINSEL_ASSISTANT_SERVICE_TIER: "priority",
    })).toThrow("only by codex-cli");
  });

  it("references a secret variable without serializing its value", () => {
    const result = pinselAssistantConfig({
      PINSEL_ASSISTANT_PROVIDER: "anthropic", PINSEL_ASSISTANT_MODEL: "test-model",
      PINSEL_ASSISTANT_EFFORT: "medium", PINSEL_ASSISTANT_API_KEY: "fixture-secret",
      PINSEL_ASSISTANT_BASE_URL: "http://127.0.0.1:4301",
    });
    expect(result).toMatchObject({ apiKeyEnv: "PINSEL_ASSISTANT_API_KEY", baseUrl: "http://127.0.0.1:4301" });
    expect(JSON.stringify(result)).not.toContain("fixture-secret");
  });

  it("allows only real fields on separate shared Content owners", () => {
    const config = pinselAssistantConfig({ PINSEL_ASSISTANT_PROVIDER: "fake" })!;
    expect(config.contentFields.map(policy => policy.modelId)).toEqual(["course", "faq-item", "home-faq", "note"]);
    for (const policy of config.contentFields) {
      const model = PINSEL_MODELS.find(item => item.id === policy.modelId)!;
      expect(model).toBeDefined();
      for (const id of policy.fieldIds) expect(model.document.fields.some(field => field.id === id)).toBe(true);
    }
  });
});
