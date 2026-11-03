import { expect, it } from "vitest";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, copyFile, chmod, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { aiProviderConfig } from "./ai-provider-config.mjs";

it("requires explicit real settings and rejects malformed or misleading settings", () => {
 expect(aiProviderConfig({})).toEqual({ provider: "fake" });
 expect(aiProviderConfig({PINSEL_AI_FAKE_FIELD:"body"})).toEqual({provider:"fake"});
 expect(()=>aiProviderConfig({PINSEL_AI_FAKE_FIELD:"other"})).toThrow();
 expect(()=>aiProviderConfig({PINSEL_AI_PROVIDER:"claude-cli",PINSEL_AI_FAKE_FIELD:"body",PINSEL_AI_MODEL:"opus",PINSEL_AI_EFFORT:"medium"})).toThrow();
 const valid = { PINSEL_AI_PROVIDER: "codex-cli", PINSEL_AI_MODEL: "gpt-6-astra", PINSEL_AI_EFFORT: "medium", PINSEL_AI_SERVICE_TIER: "default" };
 expect(aiProviderConfig(valid)).toEqual({ provider: "codex-cli", model: "gpt-6-astra", effort: "medium", serviceTier: "default" });
 for (const key of ["PINSEL_AI_MODEL", "PINSEL_AI_EFFORT", "PINSEL_AI_SERVICE_TIER"]) {
  for (const value of [undefined, "", " ", "bad\nsetting", 'bad"', "x".repeat(101)]) expect(() => aiProviderConfig({ ...valid, [key]: value })).toThrow();
  expect(() => aiProviderConfig({ PINSEL_AI_PROVIDER: "fake", [key]: "" })).toThrow();
 }
 expect(() => aiProviderConfig({ ...valid, PINSEL_AI_PROVIDER: "claude-cli" })).toThrow(/unsupported/);
 expect(() => aiProviderConfig({ ...valid, PINSEL_AI_PROVIDER: "other" })).toThrow();
});

it("root startup rejects missing CLI settings before creating state", async () => {
 const dir = await mkdtemp(path.join(tmpdir(), "pinsel-invalid-"));
 try {
  const child = fork("scripts/dev-dogfood.mjs", [], { silent: true, env: { PATH: process.env.PATH, PINSEL_AI_PROVIDER: "codex-cli", PINSEL_DOGFOOD_STATE: path.join(dir, "state") } });
  child.stdout?.resume(); child.stderr?.resume();
  const [code] = await once(child, "exit"); expect(code).not.toBe(0);
  await expect(access(path.join(dir, "state"))).rejects.toThrow();
 } finally { await rm(dir, { recursive: true, force: true }); }
});

it.each(["claude-cli", "codex-cli"])("forwards explicit %s settings through actual authenticated Node host to an offline executable", async kind => {
 const dir = await mkdtemp(path.join(tmpdir(), "pinsel-cli-"));
 const binary = path.join(dir, kind === "codex-cli" ? "codex" : "claude");
 await copyFile("scripts/fixtures/content-ai-cli.mjs", binary); await chmod(binary, 0o755);
 const token = "test-only-".repeat(8), record = path.join(dir, "argv.json");
 const child = fork("apps/authoring-worker/scripts/ai-host.mjs", [], { silent: true, env: { PATH: `${dir}${path.delimiter}${path.dirname(process.execPath)}`, PINSEL_AI_PROVIDER: kind, PINSEL_AI_TOKEN: token, PINSEL_AI_MODEL: kind === "codex-cli" ? "gpt-6-astra" : "opus", PINSEL_AI_EFFORT: "medium", ...(kind === "codex-cli" ? { PINSEL_AI_SERVICE_TIER: "default" } : {}), PINSEL_TEST_ARGV: record } });
 child.stdout?.resume(); child.stderr?.resume();
 try {
  const [message] = await once(child, "message");
  const injected = await fetch(`${message.origin}/propose`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ instruction: "shorter", fields: [], model: "other", effort: "high", serviceTier: "priority" }) });
  expect(injected.status).toBe(400);
  await expect(access(record)).rejects.toThrow();
  const response = await fetch(`${message.origin}/propose`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ instruction: "shorter", fields: [{ key: "title", kind: "text", label: "Title", value: "Original" }] }) });
  expect(await response.json()).toEqual({ kind: "proposal", values: { title: "Fixture title" }, summary: "Offline argv verification" });
  expect(response.status).toBe(200);
  const { args, tokenInherited } = JSON.parse(await readFile(record, "utf8"));
  expect(tokenInherited).toBe(false);
  if (kind === "codex-cli") {
   expect(args.slice(args.indexOf("-m"), args.indexOf("-m") + 2)).toEqual(["-m", "gpt-6-astra"]);
   expect(args).toEqual(expect.arrayContaining(['model_reasoning_effort="medium"', 'service_tier="default"', "--ignore-user-config", "--strict-config", "--sandbox", "read-only"]));
   expect(args.filter((/** @type {string} */ value) => value.startsWith("service_tier="))).toHaveLength(1);
  } else {
   expect(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2)).toEqual(["--model", "opus"]);
   expect(args.slice(args.indexOf("--effort"), args.indexOf("--effort") + 2)).toEqual(["--effort", "medium"]);
   expect(args.slice(args.indexOf("--setting-sources"), args.indexOf("--setting-sources") + 2)).toEqual(["--setting-sources", ""]);
   expect(args).toEqual(expect.arrayContaining(["--safe-mode", "--restricted", "--strict-mcp-config"]));
  }
 } finally { child.kill("SIGTERM"); await once(child, "exit"); await rm(dir, { recursive: true, force: true }); }
}, 20000);
