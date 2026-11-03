#!/usr/bin/env node
// Independent offline protocol fixture. No network, credentials or real CLI.
import { writeFileSync } from "node:fs";
const args = process.argv.slice(2), codex = (process.argv[1] ?? "").endsWith("codex");
const emit = (/** @type {unknown} */ value) => console.log(JSON.stringify(value));
if (args[0] === "--version") { console.log(codex ? "codex-cli 0.164.0" : "2.1.310 (Claude Code)"); process.exit(0); }
if (args[0] === "--help") {
 console.log("exec login --print --output-format --verbose --json-schema --system-prompt --tools --disallowedTools --strict-mcp-config --mcp-config --permission-mode dontAsk --permission-prompts --no-session-persistence --setting-sources --disable-slash-commands --safe-mode --restricted --model --effort"); process.exit(0);
}
if (args[0] === "login") { console.error("Logged in using ChatGPT"); process.exit(0); }
if (args[0] === "auth") { emit({ loggedIn: true, authMethod: "claude.ai", apiProvider: "firstParty" }); process.exit(0); }
let input = "";
for await (const chunk of process.stdin) { input += chunk.toString(); }
const request = JSON.parse(input.match(/<request_json>(.*?)<\/request_json>/s)?.[1] ?? "null");
const author = JSON.parse(request.messages[0].content[0].text);
writeFileSync(process.env.PINSEL_TEST_ARGV ?? "", JSON.stringify({ args, tokenInherited: process.env.PINSEL_AI_TOKEN !== undefined,
 toolBodyDescription: request.tools[0].input_schema.properties.body.description,
 messageBodyLabel: author.fields.find((/** @type {{key:string}} */ field)=>field.key==="body").label,
 originalInstruction: author.instruction === "shorter", originalTitleLabel: author.fields.find((/** @type {{key:string}} */ field)=>field.key==="title").label === "Title" }));
const reply = { text: "", tool_calls: [{ id: "fixture", name: "propose_article_fields", input_json: JSON.stringify({ title: "Fixture title", summary: "Offline argv verification" }) }], stop: "tool_use" };
if (codex) {
 emit({ type: "thread.started", thread_id: "fixture" }); emit({ type: "turn.started" });
 emit({ type: "item.completed", item: { id: "fixture", type: "agent_message", text: JSON.stringify(reply) } });
 emit({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } });
} else {
 emit({ type: "system", subtype: "init", tools: ["StructuredOutput"], mcp_servers: [], permissionMode: "dontAsk" });
 emit({ type: "result", subtype: "success", is_error: false, structured_output: reply, result: JSON.stringify(reply), permission_denials: [] });
}
